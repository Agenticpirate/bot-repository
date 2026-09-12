import { z } from "zod";

export const ProjectStatusSchema = z.enum(["active", "paused", "draft"]);

export const ProjectRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: ProjectStatusSchema,
  ownerName: z.string(),
});

export const ListProjectsInputSchema = z.object({
  query: z.string().trim().min(1).max(80).optional(),
  status: ProjectStatusSchema.optional(),
  limit: z.number().int().min(1).max(10).default(5),
});

export const ListProjectsOutputSchema = z.object({
  sql: z.string(),
  params: z.array(z.union([z.string(), z.number()])),
  rowCount: z.number().int().nonnegative(),
  rows: z.array(ProjectRowSchema),
});

export type ProjectRow = z.infer<typeof ProjectRowSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;
export type ListProjectsOutput = z.infer<typeof ListProjectsOutputSchema>;
