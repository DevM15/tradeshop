import { z } from "zod";

export const registerSchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
  role: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
