import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "SUPER_ADMIN") {
    redirect("/super-admin");
  } else if (["RESTAURANT_ADMIN", "MANAGER"].includes(role)) {
    redirect("/admin/dashboard");
  } else if (role === "KITCHEN_STAFF") {
    redirect("/kitchen/dashboard");
  } else {
    // WAITER, CASHIER
    redirect("/staff/queue");
  }
}
