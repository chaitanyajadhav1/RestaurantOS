import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ParcelManagementClient } from "./components/ParcelManagementClient";

export default async function ParcelManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.restaurantId) {
    redirect("/login");
  }

  const restaurantId = session.user.restaurantId;

  const [restaurant, categories, activeParcelOrders] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        settings: true,
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
        type: "TAKEAWAY",
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        customer: true,
        items: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const currency =
    restaurant?.settings &&
    typeof restaurant.settings === "object" &&
    "currency" in restaurant.settings
      ? (restaurant.settings as any).currency
      : "₹";

  const taxRate =
    restaurant?.settings &&
    typeof restaurant.settings === "object" &&
    "tax" in restaurant.settings
      ? Number((restaurant.settings as any).tax) || 5
      : 5;

  // Serialize Date objects
  const serializedOrders = activeParcelOrders.map((order) => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }));

  return (
    <div className="w-full max-w-7xl mx-auto px-3 py-3 sm:px-6 sm:py-6">
      <ParcelManagementClient
        restaurantId={restaurantId}
        restaurantName={restaurant?.name || "Restaurant"}
        currency={currency}
        taxRate={taxRate}
        categories={categories}
        initialOrders={serializedOrders}
        staffUser={{
          id: session.user.id,
          name: session.user.name || "Staff",
          role: session.user.role,
        }}
      />
    </div>
  );
}
