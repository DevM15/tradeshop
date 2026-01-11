import jwt, { JwtPayload } from "jsonwebtoken";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export type TokenPayload = {
  userId: string;
  role: string;
};

/**
 * Sign a JWT token
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d",
  });
}

/**
 * Verify a JWT token
 */

const secret = new TextEncoder().encode(JWT_SECRET);

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);

  if (!payload.userId || !payload.role) {
    throw new Error("Invalid token payload");
  }

  return payload;
}
