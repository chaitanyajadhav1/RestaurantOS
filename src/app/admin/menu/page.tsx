import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminMenuClient } from "./components/AdminMenuClient";



export default async function AdminMenuPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: session.user.restaurantId },
    orderBy: { orderIndex: "asc" },
  });

  const menuItems = await prisma.menuItem.findMany({
    where: { restaurantId: session.user.restaurantId },
    include: { category: true },
    orderBy: { category: { orderIndex: "asc" } },
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 tracking-tight text-gray-900 dark:text-white">Menu Management</h1>
      <AdminMenuClient initialCategories={categories} initialMenuItems={menuItems} />
    </div>
  );
}
