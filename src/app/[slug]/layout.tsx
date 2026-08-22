import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { UtensilsCrossed } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function CustomerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
  });

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
      <main className="w-full min-h-screen">{children}</main>
    </div>
  );
}
