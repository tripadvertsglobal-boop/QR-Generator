import { customAlphabet } from "nanoid";

// URL-safe, unambiguous alphabet (no 0/O/I/l). 7 chars ~ 3.5e12 space.
const nanoid = customAlphabet(
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  7,
);

export function generateSlug(): string {
  return nanoid();
}
