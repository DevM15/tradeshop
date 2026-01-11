import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const PUBLIC_ROUTES = ["/api/v1/auth/login", "/api/v1/auth/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow GET requests to products without auth
  if (pathname === "/api/v1/products" && req.method === "GET") {
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  // 1. Missing token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const user = (await verifyToken(token)) as { userId: string; role: string };

    // 3. Attach user to request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", user.userId);
    requestHeaders.set("x-user-role", user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // 4. Invalid token
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
