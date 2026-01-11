import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/requireRole";
import { createOrderSchema } from "@/validators/order.schema";
import { Product } from "@/models/Product";
import Order from "@/models/Order";

export async function POST(req: Request) {
  try {
    // 1. Verify JWT + role (user only)
    requireRole("user");

    // 2. Validate input
    const body = await req.json();

    const { productId, quantity } = createOrderSchema.parse(body);

    await connectDB();

    // 3. Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // 4. Check stock
    if (product.stock < quantity) {
      return NextResponse.json(
        { message: "Insufficient stock" },
        { status: 400 }
      );
    }

    // 5. Calculate total price
    const totalPrice = product.price * quantity;

    // 6. Reduce stock
    product.stock -= quantity;
    await product.save();

    // 7. Get user id from headers
    const headersList = headers();
    const userId = (await headersList).get("x-user-id");

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 8. Create order
    const order = await Order.create({
      userId,
      productId,
      quantity,
      totalPrice,
      status: "pending",
    });

    // 9. Return success
    return NextResponse.json(
      {
        success: true,
        orderId: order._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

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
