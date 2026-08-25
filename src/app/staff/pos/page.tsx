import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WaiterPosClient } from "./components/WaiterPosClient";

export default async function WaiterPosPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.restaurantId) {
    redirect("/login");
  }

  const restaurantId = session.user.restaurantId;

  const [restaurant, tables, categories, activeOrders] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    }),

    prisma.table.findMany({
      where: { restaurantId },
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: {
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          include: {
            items: {
              include: { menuItem: true },
            },
            customer: true,
          },
        },
      },
    }),

    prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: { orderIndex: "asc" },
      include: {
        items: {
          orderBy: { name: "asc" },
        },
      },
    }),

    prisma.order.findMany({
      where: {
        restaurantId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        table: true,
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-50 dark:bg-slate-950 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <WaiterPosClient
          restaurant={restaurant!}
          initialTables={tables}
          categories={categories}
          activeOrders={activeOrders}
          staffUser={{
            id: session.user.id,
            name: session.user.name || "Staff",
            role: session.user.role,
          }}
        />
      </div>
    </div>
  );
}
