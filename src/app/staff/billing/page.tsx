import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { StaffBillingClient } from "./components/StaffBillingClient";



export default async function StaffBillingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  // Fetch orders that are active and pending payment
  const unpaidOrders = await prisma.order.findMany({
    where: { 
      restaurantId: session.user.restaurantId,
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
      paymentStatus: 'PENDING'
    },
    include: {
      table: true,
      customer: true,
      items: {
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  // Serialize Date objects
  const serializedOrders = unpaidOrders.map(order => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 tracking-tight text-gray-900 dark:text-white">Billing & Checkout</h1>
      <StaffBillingClient initialOrders={serializedOrders} />
    </div>
  );
}
