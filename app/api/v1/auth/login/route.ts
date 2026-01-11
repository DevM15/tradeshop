import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/validators/auth.schema";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    // Ensure DB connection
    await connectDB();

    // 1. Validate input
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 4. Generate JWT
    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
    });

    // 5. Return token + role
    return NextResponse.json(
      {
        token,
        role: user.role,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
