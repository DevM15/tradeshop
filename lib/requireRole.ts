import { headers } from "next/headers";

export async function requireRole(role: "admin" | "user") {
  const headersList = headers();
  const userRole = (await headersList).get("x-user-role");

  if (!userRole) {
    throw new Error("Unauthorized");
  }

  if (userRole !== role) {
    throw new Error("Forbidden");
  }
}
