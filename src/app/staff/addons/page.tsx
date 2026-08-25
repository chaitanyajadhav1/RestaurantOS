import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WaiterAddonsClient } from "./components/WaiterAddonsClient";

export default async function WaiterAddonsPage({
  searchParams,
}: {
  searchParams: Promise<{ tableId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.restaurantId) {
    redirect("/login");
  }

  const restaurantId = session.user.restaurantId;
  const resolvedSearchParams = await searchParams;
  const initialSelectedTableId = resolvedSearchParams.tableId;

  const [restaurant, tables, categories] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    }),

    // Fetch all tables that are either OCCUPIED or have active orders
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
          orderBy: { createdAt: "desc" },
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
  ]);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-50 dark:bg-slate-950 p-2 sm:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <WaiterAddonsClient
          restaurant={restaurant!}
          tables={tables}
          categories={categories}
          initialTableId={initialSelectedTableId}
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
