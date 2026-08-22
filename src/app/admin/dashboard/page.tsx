import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  ChefHat,
  AlertCircle,
  ArrowUpRight,
  Zap,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PLACED:     { label: "Placed",     color: "text-blue-700",   bg: "bg-blue-100" },
  CONFIRMED:  { label: "Confirmed",  color: "text-indigo-700", bg: "bg-indigo-100" },
  PREPARING:  { label: "Preparing",  color: "text-amber-700",  bg: "bg-amber-100" },
  READY:      { label: "Ready",      color: "text-green-700",  bg: "bg-green-100" },
  SERVED:     { label: "Served",     color: "text-teal-700",   bg: "bg-teal-100" },
  COMPLETED:  { label: "Completed",  color: "text-slate-700",  bg: "bg-slate-100" },
  CANCELLED:  { label: "Cancelled",  color: "text-red-700",    bg: "bg-red-100" },
};

function StatCard({
  title,
  value,
  sub,
  icon,
  accent,
  trend,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  trend?: string;
}) {
  return (
    <div className={`relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6`}>
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 w-full h-1 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">{title}</p>
          <div className="text-4xl font-black text-slate-900 leading-none">{value}</div>
          <p className="text-xs text-slate-400 mt-2">{sub}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-emerald-600 text-xs font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          {trend}
        </div>
      )}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.restaurantId) {
    redirect("/login");
  }

  const restaurantId = session.user.restaurantId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    restaurant,
    paymentsToday,
    ordersToday,
    activeOrders,
    waitingQueue,
    totalQueueToday,
    totalTables,
    occupiedTables,
    recentOrders,
    topItems,
    ordersByStatus,
  ] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { name: true } }),

    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { restaurantId, createdAt: { gte: today }, status: "COMPLETED" },
    }),

    prisma.order.count({
      where: { restaurantId, createdAt: { gte: today } },
    }),

    prisma.order.count({
      where: {
        restaurantId,
        status: { in: ["PLACED", "CONFIRMED", "PREPARING", "READY"] },
      },
    }),

    prisma.queueEntry.count({ where: { restaurantId, status: "WAITING" } }),

    prisma.queueEntry.count({ where: { restaurantId, createdAt: { gte: today } } }),

    prisma.table.count({ where: { restaurantId } }),

    prisma.table.count({ where: { restaurantId, status: "OCCUPIED" } }),

    prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        items: { include: { menuItem: { select: { name: true } } } },
        table: { select: { number: true } },
      },
    }),

    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { restaurantId, createdAt: { gte: today } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    prisma.order.groupBy({
      by: ["status"],
      where: { restaurantId, createdAt: { gte: today } },
      _count: { status: true },
    }),
  ]);

  // Resolve top item names
  const topItemsWithNames = await Promise.all(
    topItems.map(async (item) => {
      const mi = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        select: { name: true },
      });
      return { name: mi?.name ?? "Unknown", qty: item._sum.quantity ?? 0 };
    })
  );

  const totalRevenue = paymentsToday._sum.amount ?? 0;
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  const statusCounts = Object.fromEntries(
    ordersByStatus.map((s) => [s.status, s._count.status])
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {restaurant?.name ?? "Dashboard"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            Live Dashboard
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Today's Revenue"
            value={`₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            sub="From completed payments"
            icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
            accent="bg-emerald-500"
          />
          <StatCard
            title="Orders Today"
            value={String(ordersToday)}
            sub={`${activeOrders} currently active`}
            icon={<ShoppingBag className="w-6 h-6 text-blue-600" />}
            accent="bg-blue-500"
          />
          <StatCard
            title="Queue Waiting"
            value={String(waitingQueue)}
            sub={`${totalQueueToday} total walk-ins today`}
            icon={<Users className="w-6 h-6 text-orange-600" />}
            accent="bg-orange-500"
          />
          <StatCard
            title="Table Occupancy"
            value={`${occupancyRate}%`}
            sub={`${occupiedTables} / ${totalTables} tables occupied`}
            icon={<UtensilsCrossed className="w-6 h-6 text-purple-600" />}
            accent="bg-purple-500"
          />
        </div>

        {/* Order Status Pipeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-5">
            Order Pipeline — Today
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {(["PLACED","CONFIRMED","PREPARING","READY","SERVED","COMPLETED","CANCELLED"] as const).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const count = statusCounts[s] ?? 0;
              return (
                <div key={s} className={`rounded-xl p-3 text-center ${cfg.bg}`}>
                  <div className={`text-2xl font-black ${cfg.color}`}>{count}</div>
                  <div className={`text-xs font-semibold mt-1 ${cfg.color}`}>{cfg.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Recent Orders
              </h2>
            </div>
            <div className="divide-y divide-slate-50">
              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No orders yet today</div>
              ) : (
                recentOrders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["PLACED"];
                  const itemNames = order.items.map((i) => i.menuItem.name).join(", ");
                  return (
                    <div key={order.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-slate-600">
                          {order.table ? `T${order.table.number}` : "TO"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{itemNames || "—"}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {order.type.replace("_", " ")} · ₹{order.total.toFixed(0)} ·{" "}
                          {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} shrink-0`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right column: Top Items + Quick Stats */}
          <div className="flex flex-col gap-5">

            {/* Top Selling Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-slate-400" />
                <h2 className="font-bold text-slate-900 text-sm">Top Items Today</h2>
              </div>
              <div className="p-5 space-y-3">
                {topItemsWithNames.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-sm">No orders yet</div>
                ) : (
                  topItemsWithNames.map((item, i) => {
                    const maxQty = topItemsWithNames[0]?.qty || 1;
                    const pct = Math.round((item.qty / maxQty) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700 truncate">{item.name}</span>
                          <span className="text-slate-400 font-semibold shrink-0 ml-2">×{item.qty}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Alerts */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400" /> Attention
              </h2>
              {waitingQueue > 5 && (
                <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2.5">
                  <Users className="w-4 h-4 text-orange-500 shrink-0" />
                  <p className="text-xs text-orange-700 font-medium">{waitingQueue} guests waiting in queue</p>
                </div>
              )}
              {activeOrders > 0 && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2.5">
                  <ShoppingBag className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">{activeOrders} orders in progress</p>
                </div>
              )}
              {occupancyRate >= 80 && (
                <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-2.5">
                  <UtensilsCrossed className="w-4 h-4 text-purple-500 shrink-0" />
                  <p className="text-xs text-purple-700 font-medium">High table occupancy ({occupancyRate}%)</p>
                </div>
              )}
              {waitingQueue <= 5 && activeOrders === 0 && occupancyRate < 80 && (
                <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-3 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 font-medium">All operations running smoothly</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
