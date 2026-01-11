import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { requireRole } from "@/lib/requireRole";
import { updateProductSchema } from "@/validators/product.schema";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verify admin role
    requireRole("admin");
    const { id } = await params;
    // 2. Validate input (partial update)
    const body = await req.text();
    const updates = updateProductSchema.parse(JSON.parse(body));
    await connectDB();
    console.log("Updates:", updates);

    // 3. Check existence
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    // 4. Update fields
    Object.assign(product, updates);
    await product.save();

    return NextResponse.json(
      {
        message: "Product updated successfully",
        data: product,
      },
      { status: 200 }
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

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireRole("admin");

    await connectDB();
    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === "Forbidden") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
