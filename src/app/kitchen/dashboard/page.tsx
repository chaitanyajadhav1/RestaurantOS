import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { KitchenKdsClient } from "./components/KitchenKdsClient";



export default async function KitchenDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  // Fetch active orders for kitchen
  const orders = await prisma.order.findMany({
    where: { 
      restaurantId: session.user.restaurantId,
      status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'] },
    },
    include: {
      table: true,
      items: {
        include: { menuItem: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Convert Date objects to strings for Client Component serialization
  const serializedOrders = orders.map(order => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
  }));

  return (
    <div className="p-3 md:p-4 max-w-[1800px] mx-auto">
      <KitchenKdsClient initialOrders={serializedOrders} />
    </div>
  );
}
