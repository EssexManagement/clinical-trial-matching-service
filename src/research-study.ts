// FHIR data types supporting ResearchStudy

import {
  CodeableConcept,
  ContactDetail,
  ContactPoint,
  FhirResource,
  Identifier,
  Location,
  Reference,
  ResearchStudy as IResearchStudy,
  ResearchStudyArm,
  ResearchStudyObjective,
  Resource
} from 'fhir/r4';

/**
 * Utility function to convert a list of strings into a list of CodeableConcepts.
 * If given a string that "looks like" it's a JSON array (starts and ends with '[' ']') this will attempt to parse the
 * list as JSON. (If the JSON is invalid, the exception from JSON.parse will be propegated.) Otherwise, if the
 * conditions is a string, it will be split on commas.
 *
 * @param conditions a list of strings to convert to CodeableConcepts
 */
export function convertStringsToCodeableConcept(conditions: string | string[]): CodeableConcept[] {
  if (typeof conditions === 'string') {
    if (conditions.startsWith('[') && conditions.endsWith(']')) {
      conditions = JSON.parse(conditions);
    }
  }
  if (!Array.isArray(conditions)) {
    // Use a simple, safe split to avoid catastrophic backtracking
    conditions = conditions.split(',').map(s => s.trim());
  }
  const jsonConditions: string[] = conditions;
  const fhirConditions: CodeableConcept[] = [];
  for (const condition of jsonConditions) {
    fhirConditions.push({ text: condition });
  }
  return fhirConditions;
}

export type Container<TContainer, TContained, K extends keyof TContainer> = {
  [P in K]: Array<TContained> | undefined
};
export function addToContainer<TContainer, TContained, K extends keyof TContainer>(
  container: Container<TContainer, TContained, K>,
  propertyName: K,
  item: TContained
): void {
  if (!container[propertyName]) {
    container[propertyName] = [];
  }
  // I'm unclear why TypeScript won't make this inference when the type is
  // optional, but it won't
  (container[propertyName] as Array<TContained>).push(item);
}

export function addContainedResource(researchStudy: IResearchStudy, resource: FhirResource): Reference {
  if (!researchStudy.contained)
    researchStudy.contained = [];
  researchStudy.contained.push(resource);
  return createReferenceTo(resource);
}

/**
 * Looks up a contained resource by ID. This works by scanning through every contained resource in the research study,
 * so it ultimately operates in O(n) time! If you need to continually look up references, it's recommended that to
 * instead create a Map<string, ContainedResource> to look them up.
 * @param id the ID of the resource to look up
 */
export function getContainedResource(researchStudy: IResearchStudy, id: string): FhirResource | null {
 if (researchStudy.contained) {
   // Lookup has to be done sequentially for now
   for (const contained of researchStudy.contained) {
     if (contained.id === id) {
       return contained;
     }
   }
 }
 // Contained empty/nothing found? Return null.
 return null;
}

/**
 * Creates a Reference to a resource, assuming it will be a contained resource.
 * The resource must have an `id` set on it, otherwise this will raise an error.
 * @param resource the resource to create a Reference to
 */
export function createReferenceTo(resource: Resource): Reference {
  const reference: Reference = {};
  if (resource.id) {
    reference.reference = '#' + resource.id;
  } else {
    let message = 'no ID to create reference';
    if (resource.resourceType) {
      message += ' to ' + resource.resourceType;
    }
    throw new Error(message);
  }
  if (resource.resourceType) {
    reference.type = resource.resourceType;
  }
  return reference;
}

/**
 * A basic ResearchStudy implementation, this provides helper methods for
 * doing things like adding contact information.
 */
export class ResearchStudy implements IResearchStudy {
  resourceType = 'ResearchStudy' as const;
  id?: string;
  identifier?: Identifier[];
  title?: string;
  protocol?: Reference[];
  status: IResearchStudy['status'] = 'active';
  phase?: CodeableConcept;
  category?: CodeableConcept[];
  condition?: CodeableConcept[];
  contact?: ContactDetail[];
  keyword?: CodeableConcept[];
  location?: CodeableConcept[];
  description?: string;
  arm?: ResearchStudyArm[];
  objective?: ResearchStudyObjective[];
  enrollment?: Reference[];
  sponsor?: Reference;
  principalInvestigator?: Reference;
  site?: Reference[];
  contained?: FhirResource[];

  constructor(id: string | number) {
    if (typeof id === 'number') {
      // This is mostly for convenience of using array indices as IDs
      this.id = 'study-' + id;
    } else {
      // Pointless toString is to support use from non-TypeScript apps that
      // try and use something that isn't a string.
      this.id = id.toString();
    }
    // This is done as a closure to avoid adding an enumerable property that
    // would show up in JSON output
    this.createReferenceId = (function() {
      let generatedId = 0;
      return function(prefix = 'resource') {
        return prefix + '-' + (generatedId++);
      };
    })();
  }

  /**
   * Add a contained resource, returning a reference to it that can be added
   * elsewhere. If the contained resource does not have an ID, one will be
   * created, based on the resource type.
   * @param resource the resource to add
   * @return a reference to the contained resource
   */
  addContainedResource(resource: FhirResource): Reference {
    if (!this.contained)
      this.contained = [];
    this.contained.push(resource);
    if (!resource.id) {
      resource.id = this.createReferenceId(resource.resourceType);
    }
    return createReferenceTo(resource);
  }

  /**
   * Creates a new, probably unique ID for a contained resource. (At present
   * this doesn't go through the contained resources to ensure the ID is
   * actually unique.)
   * @param prefix the prefix for the reference
   */
  createReferenceId: (prefix?: string) => string;

  /**
   * Adds a contact to the contact field.
   *
   * @param contact the contact to add
   */
  addContact(contact: ContactDetail): ContactDetail;
  /**
   * Adds a contact to the contact field.
   *
   * @param name the name of the contact
   * @param phone the work phone number of the contact
   * @param email the work email of the contact
   * @returns the newly created contact
   */
  addContact(name: string, phone?: string, email?: string): ContactDetail;
  addContact(nameOrContact: ContactDetail | string, phone?: string, email?: string): ContactDetail {
    const contact: ContactDetail = typeof nameOrContact === 'string' ? {} : nameOrContact;
    if (typeof nameOrContact === 'string') {
      contact.name = nameOrContact;
      if (phone || email) {
        const telecoms: ContactPoint[] = [];
        if (phone) {
          telecoms.push({ system: 'phone', value: phone, use: 'work' });
        }
        if (email) {
          telecoms.push({ system: 'email', value: email, use: 'work' });
        }
        contact.telecom = telecoms;
      }
    }
    if (!this.contact)
      this.contact = [];
    this.contact.push(contact);
    return contact;
  }

  /**
   * Adds a site as a contained resource.
   * @param name the name of the site to add
   * @return the location added
   */
  addSite(name: string, phone?: string, email?: string): Location;

  addSite(location: Location): Location;

  addSite(nameOrLocation: string | Location, phone?: string, email?: string): Location {
    const location: Location = typeof nameOrLocation === 'string' ?
      { resourceType: 'Location', id: this.createReferenceId('location'), name: nameOrLocation } :
      nameOrLocation;
    if (typeof nameOrLocation === 'string') {
      // Also possibly add the telecoms
      if (phone) {
        addToContainer<Location, ContactPoint, 'telecom'>(location, 'telecom', { system: 'phone', value: phone, use: 'work' });
      }
      if (email) {
        addToContainer<Location, ContactPoint, 'telecom'>(location, 'telecom', { system: 'email', value: email, use: 'work' });
      }
    }
    addToContainer<ResearchStudy, Reference, 'site'>(this, 'site', this.addContainedResource(location));
    return location;
  }
}

export default ResearchStudy;
