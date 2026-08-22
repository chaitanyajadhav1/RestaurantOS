import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CustomerAppView } from "./components/CustomerAppView";

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  // Verify session: allow customer of this restaurant OR staff/admin of this restaurant to view menu
  const session = await getServerSession(authOptions);
  
  const isCustomerOfRestaurant = session?.user?.role === "CUSTOMER" && session.user.restaurantSlug === slug;
  const isStaffOfRestaurant = session?.user?.restaurantSlug === slug || session?.user?.role === "SUPER_ADMIN";

  if (!session || (!isCustomerOfRestaurant && !isStaffOfRestaurant)) {
    redirect(`/${slug}/login`);
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: {
      menuCategories: {
        orderBy: { orderIndex: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
          },
        },
      },
    },
  });

  if (!restaurant) notFound();

  const currency = (restaurant.settings && typeof restaurant.settings === 'object' && 'currency' in restaurant.settings)
    ? (restaurant.settings as any).currency 
    : "₹";

  return (
    <CustomerAppView
      restaurant={restaurant}
      categories={restaurant.menuCategories}
      customerName={session.user.name || "Guest"}
      customerPhone={(session.user as any).phone || undefined}
      currency={currency}
    />
  );
}
