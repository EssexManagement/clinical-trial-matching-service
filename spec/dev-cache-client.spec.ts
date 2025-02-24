import { DevCacheClient, DevCacheNoopClient, devCacheClientConstructor } from '../src/dev-cache-client';
import * as redis from 'redis';

describe('devCacheClientConstructor', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // happy case
    process.env = { ...originalEnv, NODE_ENV: 'development', REDIS_HOST: 'localhost', REDIS_PORT: '6379' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return a DevCacheClient if NODE_ENV is development and REDIS_HOST and REDIS_PORT are set', async () => {
    const mockClient = {
      on: () => {},
      connect: () => {}
    };
    // @ts-ignore
    spyOn(redis, 'createClient').and.returnValue(mockClient);

    const result = await devCacheClientConstructor();
    expect(result).toBeInstanceOf(DevCacheClient);
    expect(redis.createClient).toHaveBeenCalledWith({ url: 'redis://localhost:6379' });
  });

  it('should return a DevCacheNoopClient if NODE_ENV is not development', async () => {
    process.env.NODE_ENV = 'production';

    const result = await devCacheClientConstructor();
    expect(result).toBeInstanceOf(DevCacheNoopClient);
  });

  it('should return a DevCacheNoopClient if REDIS_HOST is not set', async () => {
    delete process.env.REDIS_HOST;

    const result = await devCacheClientConstructor();
    expect(result).toBeInstanceOf(DevCacheNoopClient);
  });

  it('should return a DevCacheNoopClient if REDIS_PORT is not set', async () => {
    delete process.env.REDIS_PORT;

    const result = await devCacheClientConstructor();
    expect(result).toBeInstanceOf(DevCacheNoopClient);
  });
});
