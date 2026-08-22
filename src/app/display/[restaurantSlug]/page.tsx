import { prisma } from "@/lib/prisma";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";
import { DisplayQueueClient } from "./components/DisplayQueueClient";



export default async function DisplayQueuePage({ params }: { params: { restaurantSlug: string } }) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.restaurantSlug },
    select: {
      id: true,
      name: true,
    }
  });

  if (!restaurant) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden flex flex-col">
      <header className="p-6 bg-slate-800 flex justify-between items-center shadow-lg border-b border-slate-700">
        <h1 className="text-4xl font-black tracking-tight">{restaurant.name}</h1>
        <div className="text-xl font-medium text-slate-300">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </header>

      <main className="flex-1 flex">
        <DisplayQueueClient restaurantId={restaurant.id} />
      </main>
    </div>
  );
}
