import bcrypt from "bcryptjs";

type QrInput = {
  password?: string | null;
  archived?: boolean;
  [key: string]: unknown;
};

/**
 * Maps validated create/update input to qr_codes columns, hashing `password`
 * into `password_hash` and turning the `archived` boolean into the `archived_at`
 * timestamp. For both, `undefined` leaves the column untouched.
 */
export async function toDbFields(input: QrInput): Promise<Record<string, unknown>> {
  const { password, archived, ...rest } = input;
  const fields: Record<string, unknown> = { ...rest };
  if (password !== undefined) {
    fields.password_hash = password === null ? null : await bcrypt.hash(password, 10);
  }
  if (archived !== undefined) {
    fields.archived_at = archived ? new Date().toISOString() : null;
  }
  return fields;
}

/** Strip the password hash from any row before returning it over the API. */
export function stripSecret<T extends { password_hash?: unknown }>(row: T): Omit<T, "password_hash"> {
  const { password_hash: _omit, ...safe } = row;
  void _omit;
  return safe;
}
