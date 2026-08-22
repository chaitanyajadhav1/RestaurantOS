"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Clock, ChefHat, CheckCircle2, Play, Utensils, 
  Sparkles, RefreshCw, Bell, Search, AlertCircle, Check, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type OrderItem = {
  id: string;
  quantity: number;
  specialInstructions: string | null;
  menuItem: { 
    name: string;
    type?: string;
  };
};

type Order = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  table?: { number: string; location?: string | null } | null;
  customer?: { name: string | null; phone?: string } | null;
  items: OrderItem[];
};

export function KitchenKdsClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchTable, setSearchTable] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success) {
        const active = json.data.filter((o: Order) => 
          ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
        );
        setOrders(active);
      }
    } catch (err) {
      console.error("Failed to fetch KDS orders");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Ticket updated to ${status.replace('_', ' ')}` });
        fetchOrders();
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    }
  };

  // Filter orders by search
  const filteredOrders = orders.filter(o => {
    if (!searchTable.trim()) return true;
    const q = searchTable.toLowerCase();
    const tableMatch = o.table?.number.toLowerCase().includes(q);
    const itemMatch = o.items.some(i => i.menuItem.name.toLowerCase().includes(q));
    return tableMatch || itemMatch;
  });

  const newOrders = filteredOrders.filter(o => o.status === 'PLACED' || o.status === 'CONFIRMED');
  const preparingOrders = filteredOrders.filter(o => o.status === 'PREPARING');
  const readyOrders = filteredOrders.filter(o => o.status === 'READY');

  const getElapsedTime = (createdAt: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins > 60) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    return `${diffMins}m ago`;
  };

  const isOrderFresh = (createdAt: string) => {
    const diffMins = (new Date().getTime() - new Date(createdAt).getTime()) / 60000;
    return diffMins < 5;
  };

  const OrderCard = ({ order, statusColor, actions }: { order: Order; statusColor: string; actions: React.ReactNode }) => {
    const elapsed = getElapsedTime(order.createdAt);
    const fresh = isOrderFresh(order.createdAt);

    return (
      <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all ${
        fresh && order.status === 'PLACED'
          ? "border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/20 dark:bg-slate-900/95"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      }`}>
        {/* Card Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {order.table ? `Table ${order.table.number}` : 'Takeaway'}
              </span>
              {fresh && (
                <span className="bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse uppercase">
                  NEW!
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              <span>#{order.id.slice(-6).toUpperCase()}</span>
              {order.table?.location && <span>• {order.table.location}</span>}
              {order.customer?.name && <span>• {order.customer.name}</span>}
            </div>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-500 mr-1" />
            <span>{elapsed}</span>
          </div>
        </div>

        {/* Dish Items List */}
        <div className="py-3.5 space-y-2.5 flex-1">
          {(!order.items || order.items.length === 0) ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
              Guest seated • Waiting for dishes to be placed...
            </p>
          ) : (
            order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between text-sm">
                <div className="flex items-start space-x-2 flex-1">
                  <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                    {item.quantity}x
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight">
                      {item.menuItem?.name || "Dish Item"}
                    </span>
                    {item.specialInstructions && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded px-2 py-1 mt-1 italic">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          {actions}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* KDS TOP CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Summary Metrics */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs">
            <ChefHat className="w-4 h-4 text-amber-500" />
            <span>Active Tickets: {orders.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>New: {newOrders.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Cooking: {preparingOrders.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ready: {readyOrders.length}</span>
          </div>
        </div>

        {/* Right: Search & Refresh */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search table / dish..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="h-8 text-xs pl-8 w-44 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl"
            />
          </div>

          <Button
            onClick={() => {
              setIsRefreshing(true);
              fetchOrders();
            }}
            size="sm"
            variant="outline"
            className="h-8 text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 3-COLUMN KANBAN WORKSPACE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-140px)] min-h-[550px]">
        
        {/* COLUMN 1: NEW TICKETS */}
        <div className="bg-slate-100/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                1. New Orders
              </h2>
            </div>
            <Badge className="bg-rose-600 text-white font-bold text-xs px-2 py-0.5">
              {newOrders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {newOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No new incoming orders</p>
              </div>
            ) : (
              newOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  statusColor="rose"
                  actions={
                    <Button
                      onClick={() => updateStatus(order.id, 'PREPARING')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 text-sm"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start Cooking 👨‍🍳</span>
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PREPARATION */}
        <div className="bg-slate-100/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                2. Cooking / Preparing
              </h2>
            </div>
            <Badge className="bg-blue-600 text-white font-bold text-xs px-2 py-0.5">
              {preparingOrders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No food currently cooking</p>
              </div>
            ) : (
              preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  statusColor="blue"
                  actions={
                    <Button
                      onClick={() => updateStatus(order.id, 'READY')}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready to Serve 🛎️</span>
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY TO SERVE */}
        <div className="bg-slate-100/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                3. Ready for Service
              </h2>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs px-2 py-0.5">
              {readyOrders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {readyOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No orders awaiting pickup</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  statusColor="emerald"
                  actions={
                    <Button
                      onClick={() => updateStatus(order.id, 'COMPLETED')}
                      variant="outline"
                      className="w-full border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-bold h-10 rounded-xl flex items-center justify-center space-x-1.5 text-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Served to Table</span>
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
