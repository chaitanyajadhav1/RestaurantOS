import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminMenuClient } from "./components/AdminMenuClient";

export default async function AdminMenuPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  const [restaurant, categories, menuItems] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { settings: true, name: true },
    }),
    prisma.menuCategory.findMany({
      where: { restaurantId: session.user.restaurantId },
      orderBy: { orderIndex: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: { category: true },
      orderBy: { category: { orderIndex: "asc" } },
    }),
  ]);

  const currency =
    restaurant?.settings &&
    typeof restaurant.settings === "object" &&
    "currency" in restaurant.settings
      ? (restaurant.settings as any).currency
      : "₹";

  return (
    <div className="w-full max-w-7xl mx-auto px-3 py-3 sm:px-6 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Menu Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
          Add, edit, organize categories, and control live item availability
        </p>
      </div>
      <AdminMenuClient
        initialCategories={categories}
        initialMenuItems={menuItems}
        currency={currency}
      />
    </div>
  );
}
