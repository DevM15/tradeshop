import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(5).max(1000),
  price: z.number().positive(),
  stock: z.number().int().min(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(5).max(1000).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
