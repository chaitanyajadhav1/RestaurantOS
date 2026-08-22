import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/signup
// Only allows SUPER_ADMIN creation, validated by SUPER_ADMIN_SECRET env key.
// All other roles are created exclusively via invite links.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, secretKey } = body;

    // 1. Validate required fields
    if (!name || !email || !password || !secretKey) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Validate the secret key against the env variable
    const validSecret = process.env.SUPER_ADMIN_SECRET;
    if (!validSecret || secretKey !== validSecret) {
      return NextResponse.json(
        { message: "Invalid admin secret key" },
        { status: 403 }
      );
    }

    // 3. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Hash password and create Super Admin
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Find or create platform restaurant for Super Admin
    let platformRestaurant = await prisma.restaurant.findFirst();
    if (!platformRestaurant) {
      platformRestaurant = await prisma.restaurant.create({
        data: {
          name: "Platform Administration",
          slug: "platform-admin",
        }
      });
    }

    const user = await prisma.user.create({
      data: {
        restaurantId: platformRestaurant.id,
        name,
        email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
      },
    });

    return NextResponse.json(
      {
        message: "Super Admin account created successfully",
        user: { id: user.id, email: user.email, role: user.role },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
