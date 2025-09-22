import type { RedisClientType } from 'redis';

export class DevCacheClientAbs {
  connect(): Promise<void> {
    throw Error('Method not implemented.');
  }
  /**
   * Returns the JSON.parsable value located at the key (if any). Always returns null when
   * the client is a noop client.
   */
  get(_key: string): Promise<object | null | void> {
    throw Error('Method not implemented.');
  }
  /**
   * Either sets the value in the cache or does nothing if the client is a noop client.
   * @param _key
   * @param _value - stringified before saving in cache
   */
  set(_key: string, _value: object): Promise<void> {
    throw Error('Method not implemented');
  }
  /**
   * Either quits the client or does nothing if the client is a noop client.
   */
  quit(): Promise<void> {
    throw Error('Method not implemented');
  }
}

export class DevCacheClient extends DevCacheClientAbs {
  private client: RedisClientType;

  constructor(client: RedisClientType) {
    super();
    this.client = client;
    this.client.on('error', (err) => console.log('Redis Client Error', err));
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('Connected to Redis Client');
    } catch (err) {
      console.error('Error connecting to Redis Client:', err);
    }
  }

  async get(key: string): Promise<object | null> {
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: string | StringConstructor | object, ttlHours = 24) {
    if (value instanceof String) {
      value = value.toString();
    }
    this.client.set(key, typeof value === 'string' ? value : JSON.stringify(value), {
      EX: 60 * 60 * ttlHours
    });
  }

  async quit() {
    await this.client.quit();
    console.log('Disconnected from Redis Client');
  }
}

export class DevCacheNoopClient extends DevCacheClientAbs {
  async connect() {}
  async get() {}
  async set() {}
  async quit() {}
}

/**
 * Depends on several environment variables:
 * - NODE_ENV: must be 'development' to enable the dev cache
 * - REDIS_HOST: the host of the Redis server
 * - REDIS_PORT: the port of the Redis server
 * @returns a DevCacheClient if the environment is set up correctly, otherwise a DevCacheNoopClient
 */
export async function devCacheClientConstructor(): Promise<DevCacheClient | DevCacheNoopClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!process.env.REDIS_HOST) {
      console.warn('REDIS_HOST environment variable not set. Skipping dev cache.');
      return new DevCacheNoopClient();
    }
    if (!process.env.REDIS_PORT) {
      console.warn('REDIS_PORT environment variable not set. Skipping dev cache.');
      return new DevCacheNoopClient();
    }
    const host: string = process.env.REDIS_HOST;
    const port: string = process.env.REDIS_PORT;
    let createClient;
    try {
      ({ createClient } = await import('redis'));
    } catch (error) {
      console.warn('redis package not installed. Skipping dev cache.');
      return new DevCacheNoopClient();
    }
    const client = createClient({
      url: `redis://${host}:${port}`
    });
    return new DevCacheClient(client as RedisClientType);
  } else {
    return new DevCacheNoopClient();
  }
}

export async function devCacheActive(): Promise<boolean> {
  const client = await devCacheClientConstructor();
  if (client instanceof DevCacheClient) {
    await client.connect();
    await client.quit();
    return true;
  }
  return false;
}
