import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Role } from "@prisma/client";

// Staff roles a restaurant admin can create
const ALLOWED_STAFF_ROLES: Role[] = ["MANAGER", "WAITER", "CASHIER", "KITCHEN_STAFF", "RESTAURANT_ADMIN"];

// GET /api/restaurant-admin/staff — list all staff for the restaurant
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!["SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [staff, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { restaurantId: session.user.restaurantId },
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { restaurantId: session.user.restaurantId, status: "PENDING" },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ staff, pendingInvitations: invitations });
}

// POST /api/restaurant-admin/staff — create a staff member directly or via invitation
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.restaurantId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!["RESTAURANT_ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role, useInvite } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ message: "Email and role are required" }, { status: 400 });
  }

  if (!ALLOWED_STAFF_ROLES.includes(role as Role)) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
  }

  const restaurantId = session.user.restaurantId;

  // Option A: Generate invite link (no password set yet)
  if (useInvite) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.create({
      data: { restaurantId, email, role: role as Role, token, expiresAt },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;
    return NextResponse.json({ invitation, inviteUrl }, { status: 201 });
  }

  // Option B: Create account directly with password
  if (!name || !password) {
    return NextResponse.json({ message: "Name and password are required for direct creation" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { restaurantId, name, email, password: hashedPassword, role: role as Role },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
