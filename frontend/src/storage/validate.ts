/** JSON Schema validation (ajv) for backup files and the curriculum, using shared/contracts schemas. */

import Ajv2020 from 'ajv/dist/2020';
import backupSchema from '@contracts/schemas/backup.schema.json';
import curriculumSchema from '@contracts/schemas/curriculum.schema.json';

export type Validation = { ok: true } | { ok: false; errors: string[] };

const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true });

function validator(schema: object) {
  const check = ajv.compile(schema);
  return (data: unknown): Validation => {
    if (check(data)) return { ok: true };
    return {
      ok: false,
      errors: (check.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`),
    };
  };
}

export const validateBackup = validator(backupSchema);
export const validateCurriculum = validator(curriculumSchema);
