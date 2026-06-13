import { z } from "zod";

const httpUrl = z
  .string()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid http(s) URL");

const name = z.string().trim().min(1).max(200);

export const createQrSchema = z.object({
  destination_url: httpUrl,
  name: name.nullish(),
});

export const updateQrSchema = z
  .object({
    destination_url: httpUrl.optional(),
    is_active: z.boolean().optional(),
    name: name.nullish(),
  })
  .refine((d) => Object.keys(d).length > 0, "No fields to update");

export type CreateQrInput = z.infer<typeof createQrSchema>;
export type UpdateQrInput = z.infer<typeof updateQrSchema>;
