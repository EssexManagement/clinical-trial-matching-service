// Export our public API from this package

/**
 * Namespace the FHIR types within FHIR as ResearchStudy overlaps otherwise
 */
export * from './research-study';
export * from './searchset';
export * from './clinicaltrialsgov';
export { CodeMapper, CodeSystemEnum } from './codeMapper';
export * from './mcodeextractor';
export { MappingLogic } from './mappinglogic';
export { Study } from './ctg-api';
export { ClinicalTrialsGovAPI } from './clinical-trials-gov';
export { updateResearchStudyWithClinicalStudy } from './study-fhir-converter';

// The export { v } from "mod" forms do not appear to work for types yet, so
// they have to be imported and then exported...
import BasicHttpError, { HttpError, ServerError, ClientError } from './errors';
import ClinicalTrialMatchingService, { ClinicalTrialMatcher, Configuration } from './server';

// Export the utility for configuring from the environment
export * from './env';

export default ClinicalTrialMatchingService;
export {
  ClinicalTrialMatcher,
  ClinicalTrialMatchingService,
  Configuration as ServiceConfiguration,
  BasicHttpError,
  HttpError,
  ClientError,
  ServerError
};
