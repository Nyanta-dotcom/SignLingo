/** Types for validators.gen.js (Ajv standalone code, see scripts/gen-validators.mjs). */
export type GeneratedValidator = ((data: unknown) => boolean) & {
  errors?: Array<{ instancePath: string; message?: string }> | null;
};

export const validateBackup: GeneratedValidator;
export const validateCurriculum: GeneratedValidator;
export const validateModelIndex: GeneratedValidator;
export const validateModelManifest: GeneratedValidator;
export const validateExperimentIndex: GeneratedValidator;
export const validateLandmarkCapture: GeneratedValidator;
export const validateExperiment: GeneratedValidator;
