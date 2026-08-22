import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UnifiedFloorQueueClient, FloorLayoutConfig } from "./components/UnifiedFloorQueueClient";

export default async function AdminTablesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  // Fetch Tables with active orders
  const tables = await prisma.table.findMany({
    where: { restaurantId: session.user.restaurantId },
    include: {
      orders: {
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        },
        include: {
          customer: true,
          queueEntry: true,
          items: {
            include: { menuItem: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { number: "asc" },
  });

  // Fetch active queue entries (WAITING & CALLED)
  const queueEntries = await prisma.queueEntry.findMany({
    where: { 
      restaurantId: session.user.restaurantId,
      status: { in: ['WAITING', 'CALLED'] }
    },
    include: { customer: true },
    orderBy: { createdAt: 'asc' }
  });

  // Fetch restaurant floor layout settings
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: session.user.restaurantId },
    select: { settings: true, name: true }
  });

  const settings = (restaurant?.settings as any) || {};
  const floorPlan: FloorLayoutConfig = settings.floorPlan || {
    gridRows: 6,
    gridCols: 6,
    positions: {}
  };

  // Serialize Date objects for React Server to Client Component compatibility
  const serializedTables = tables.map(t => ({
    ...t,
    orders: t.orders.map(o => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }))
  }));

  const serializedQueue = queueEntries.map(q => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
  }));

  return (
    <div className="p-2 md:p-3 max-w-[1800px] mx-auto">
      <UnifiedFloorQueueClient
        initialTables={serializedTables}
        initialQueue={serializedQueue}
        initialLayout={floorPlan}
        restaurantId={session.user.restaurantId}
        userRole={session.user.role}
      />
    </div>
  );
}
