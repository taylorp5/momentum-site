import { z } from "zod";

export const projectStatusSchema = z.enum([
  "idea",
  "building",
  "launched",
  "paused",
]);

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(2000).optional().default(""),
  status: projectStatusSchema.default("idea"),
  logo_url: z.string().url().max(1000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #6366f1")
    .default("#6366f1"),
  icon: z.string().max(64).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(2000).optional().default(""),
  status: projectStatusSchema,
  logo_url: z.string().url().max(1000).optional().nullable(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const deleteProjectSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;
