import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { StaffOrdersClient } from "./components/StaffOrdersClient";



export default async function StaffOrdersPage() {
  const session = await getServerSession(authOptions);

  console.log("StaffOrdersPage - Session:", session ? "Exists" : "Null", "User:", session?.user);

  if (!session?.user?.restaurantId) {
    console.log("StaffOrdersPage - Redirecting to login. Reason: No restaurantId");
    redirect("/login");
  }

  const orders = await prisma.order.findMany({
    where: { 
      restaurantId: session.user.restaurantId,
    },
    include: {
      table: true,
      customer: true,
      items: {
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50 // Limit for MVP
  });

  // Convert Date objects to strings for Client Component serialization
  const serializedOrders = orders.map(order => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 tracking-tight text-gray-900 dark:text-white">Order Management</h1>
      <StaffOrdersClient initialOrders={serializedOrders} />
    </div>
  );
}
