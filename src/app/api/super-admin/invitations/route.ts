import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { Role } from "@prisma/client";

// POST /api/super-admin/invitations — create an invitation for a hotel admin
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { email, restaurantId, role } = await req.json();

  if (!email || !restaurantId) {
    return NextResponse.json({ message: "Email and restaurant are required" }, { status: 400 });
  }

  // Super Admin can only invite hotel-level roles
  const ALLOWED_ROLES: Role[] = ["RESTAURANT_ADMIN", "MANAGER"];
  const assignedRole: Role = ALLOWED_ROLES.includes(role as Role) ? (role as Role) : "RESTAURANT_ADMIN";


  // Check restaurant exists
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    return NextResponse.json({ message: "Restaurant not found" }, { status: 404 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
  }

  // Check for pending invitation
  const existingInvite = await prisma.invitation.findFirst({
    where: { email, restaurantId, status: "PENDING" },
  });
  if (existingInvite) {
    return NextResponse.json({ message: "A pending invitation already exists for this email" }, { status: 409 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const invitation = await prisma.invitation.create({
    data: { restaurantId, email, role: assignedRole, token, expiresAt },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

  return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
}
