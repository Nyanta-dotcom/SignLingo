/** Schema migrations (docs/03 §3.1): every change of a stored shape adds `MIGRATIONS[vN]` (vN -> vN+1). */

export const CURRENT_VERSION = 1;

type Data = Record<string, unknown>;
export type Migrations = Readonly<Record<number, (data: Data) => Data>>;

/** v1 is the first release: no steps yet. */
export const MIGRATIONS: Migrations = {};

export function migrate(
  data: Data,
  migrations: Migrations = MIGRATIONS,
  target: number = CURRENT_VERSION,
): Data & { schema_version: number } {
  let version = typeof data.schema_version === 'number' ? data.schema_version : 1;
  if (version > target) {
    throw new Error(`stored data is from a newer version (${version}) than this app (${target})`);
  }
  let out: Data = { ...data };
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new Error(`missing migration from version ${version} to ${version + 1}`);
    out = step(out);
    version += 1;
  }
  return { ...out, schema_version: version };
}
