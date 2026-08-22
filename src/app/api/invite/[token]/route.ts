import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/invite/[token] — validate invitation token
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { restaurant: { select: { name: true, id: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ message: "Invalid invitation link" }, { status: 404 });
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json({ message: "This invitation has already been used" }, { status: 410 });
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
    return NextResponse.json({ message: "This invitation has expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    restaurantName: invitation.restaurant.name,
    restaurantId: invitation.restaurantId,
  });
}

// POST /api/invite/[token] — accept invitation, set name + password
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { name, password } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ message: "Name and password are required" }, { status: 400 });
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.status !== "PENDING" || new Date() > invitation.expiresAt) {
    return NextResponse.json({ message: "Invalid or expired invitation" }, { status: 410 });
  }

  // Check email not already taken
  const existing = await prisma.user.findUnique({ where: { email: invitation.email } });
  if (existing) {
    return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the user and mark invite as accepted in a transaction
  await prisma.$transaction([
    prisma.user.create({
      data: {
        restaurantId: invitation.restaurantId,
        name,
        email: invitation.email,
        password: hashedPassword,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({
      where: { token },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
}
