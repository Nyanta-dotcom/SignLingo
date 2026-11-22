/**
 * JSON Schema validation for backup files, the curriculum and the static data, using shared/contracts schemas.
 * The validators are compiled ahead of time (scripts/gen-validators.mjs): the Content-Security-Policy forbids
 * `new Function`, so Ajv must not compile schemas in the browser.
 */

import * as generated from './validators.gen.js';
import type { GeneratedValidator } from './validators.gen.js';

export type Validation = { ok: true } | { ok: false; errors: string[] };

function validator(check: GeneratedValidator) {
  return (data: unknown): Validation => {
    if (check(data)) return { ok: true };
    return {
      ok: false,
      errors: (check.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`),
    };
  };
}

export const validateBackup = validator(generated.validateBackup);
export const validateCurriculum = validator(generated.validateCurriculum);
export const validateModelIndex = validator(generated.validateModelIndex);
export const validateModelManifest = validator(generated.validateModelManifest);
export const validateExperimentIndex = validator(generated.validateExperimentIndex);
export const validateLandmarkCapture = validator(generated.validateLandmarkCapture);
export const validateExperiment = validator(generated.validateExperiment);
