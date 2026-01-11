import { z } from "zod";

export const createOrderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
