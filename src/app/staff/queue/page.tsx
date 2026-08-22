import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffQueueClient } from "./components/StaffQueueClient";

export default async function StaffQueuePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 tracking-tight text-slate-900">Queue Management</h1>
        <StaffQueueClient restaurantId={session.user.restaurantId} />
      </div>
    </div>
  );
}
