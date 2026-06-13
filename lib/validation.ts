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
const uuid = z.string().uuid();
const tags = z.array(z.string().trim().min(1).max(50)).max(20);
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a #rrggbb hex value");

// M7 advanced-link fields.
const password = z.string().min(4).max(200);
const abDestinations = z
  .array(z.object({ url: httpUrl, weight: z.number().int().min(1).max(100) }))
  .min(2, "A/B split needs at least two destinations")
  .max(10);

export const createQrSchema = z.object({
  destination_url: httpUrl,
  name: name.nullish(),
  folder_id: uuid.nullish(),
  tags: tags.optional(),
  active_from: z.string().datetime().nullish(),
  active_until: z.string().datetime().nullish(),
  password: password.nullish(),
  ab_destinations: abDestinations.nullish(),
});

export const updateQrSchema = z
  .object({
    destination_url: httpUrl.optional(),
    is_active: z.boolean().optional(),
    name: name.nullish(),
    folder_id: uuid.nullish(),
    tags: tags.optional(),
    active_from: z.string().datetime().nullish(),
    active_until: z.string().datetime().nullish(),
    password: password.nullish(), // string = set, null = clear, undefined = leave
    ab_destinations: abDestinations.nullish(),
  })
  .refine((d) => Object.keys(d).length > 0, "No fields to update");

export const createFolderSchema = z.object({
  name: name,
  color: hexColor.nullish(),
});

export const updateFolderSchema = z
  .object({
    name: name.optional(),
    color: hexColor.nullish(),
  })
  .refine((d) => Object.keys(d).length > 0, "No fields to update");

// Bulk create: up to 100 destinations at once.
export const bulkCreateSchema = z.object({
  codes: z
    .array(
      z.object({
        destination_url: httpUrl,
        name: name.nullish(),
        folder_id: uuid.nullish(),
        tags: tags.optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
});

const apiScope = z.enum(["qrcodes:read", "qrcodes:write"]);

export const createKeySchema = z.object({
  name: name,
  scopes: z.array(apiScope).min(1).optional(),
  rate_limit: z.number().int().min(1).max(10000).optional(),
  expires_at: z.string().datetime().nullish(),
});

export type CreateQrInput = z.infer<typeof createQrSchema>;
export type UpdateQrInput = z.infer<typeof updateQrSchema>;
