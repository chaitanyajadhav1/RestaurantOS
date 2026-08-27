"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package,
  PlusCircle,
  Clock,
  CheckCircle2,
  ChefHat,
  Search,
  Plus,
  Minus,
  Trash2,
  Phone,
  User,
  ShoppingBag,
  ReceiptText,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Sparkles,
  Flame,
  Leaf,
  X,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  DollarSign,
  Send,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  isAvailable: boolean;
  preparationTime: number | null;
  categoryId: string;
};

type MenuCategory = {
  id: string;
  name: string;
  orderIndex: number;
  items: MenuItem[];
};

type CartItem = {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
};

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  specialInstructions: string | null;
  menuItem: {
    name: string;
    type?: string;
  };
};

type ParcelOrder = {
  id: string;
  status: string;
  type: string;
  partyLabel?: string | null;
  guestCount?: number | null;
  groupName?: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: string;
  createdAt: string;
  customer?: { name: string | null; phone?: string } | null;
  items: OrderItem[];
};

export function ParcelManagementClient({
  restaurantId,
  restaurantName,
  currency = "₹",
  taxRate = 5,
  categories,
  initialOrders,
  staffUser,
}: {
  restaurantId: string;
  restaurantName: string;
  currency?: string;
  taxRate?: number;
  categories: MenuCategory[];
  initialOrders: ParcelOrder[];
  staffUser: { id: string; name: string; role: string };
}) {
  // Orders State (Auto-syncing with KDS)
  const [orders, setOrders] = useState<ParcelOrder[]>(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"pos" | "tracker">("pos");

  // Tracker Filter States
  const [trackerFilter, setTrackerFilter] = useState<"ALL" | "KITCHEN" | "READY" | "COMPLETED">("ALL");
  const [trackerSearch, setTrackerSearch] = useState("");

  // POS Form States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tokenNumber, setTokenNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [includePackagingFee, setIncludePackagingFee] = useState(true);
  const [paymentOption, setPaymentOption] = useState<"PAID_CASH" | "PAID_UPI" | "PAID_CARD" | "PAY_ON_PICKUP">("PAY_ON_PICKUP");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // POS Menu Filter States
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Modals
  const [printOrder, setPrintOrder] = useState<ParcelOrder | null>(null);
  const [settleOrderTarget, setSettleOrderTarget] = useState<ParcelOrder | null>(null);
  const [settleMethod, setSettleMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [isSettling, setIsSettling] = useState(false);

  // Auto-generate Token on Mount or after placement
  const generateNewToken = useCallback(() => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setTokenNumber(`P-${randomNum}`);
  }, []);

  useEffect(() => {
    generateNewToken();
  }, [generateNewToken]);

  // Fetch / Sync Parcel Orders with Kitchen
  const fetchParcelOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const takeawayOnly = json.data.filter((o: ParcelOrder) => o.type === "TAKEAWAY");
        setOrders(takeawayOnly);
      }
    } catch (err) {
      console.error("Failed to sync parcel orders:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Poll kitchen updates every 3.5 seconds
  useEffect(() => {
    fetchParcelOrders();
    const interval = setInterval(fetchParcelOrders, 3500);
    return () => clearInterval(interval);
  }, [fetchParcelOrders]);

  // Metrics
  const stats = useMemo(() => {
    const totalToday = orders.length;
    const inKitchen = orders.filter((o) => ["PLACED", "CONFIRMED", "PREPARING"].includes(o.status)).length;
    const readyForPickup = orders.filter((o) => o.status === "READY").length;
    const completed = orders.filter((o) => o.status === "COMPLETED").length;
    return { totalToday, inKitchen, readyForPickup, completed };
  }, [orders]);

  // All Available Menu Items flattened
  const allMenuItems = useMemo(() => {
    const list: MenuItem[] = [];
    categories.forEach((c) => {
      c.items.forEach((item) => {
        if (item.isAvailable) list.push(item);
      });
    });
    return list;
  }, [categories]);

  // Filtered Menu Items for POS
  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter((item) => {
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesDesc) return false;
      }
      if (selectedCategory !== "ALL" && item.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedType !== "ALL" && item.type.toLowerCase() !== selectedType.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [allMenuItems, menuSearch, selectedCategory, selectedType]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }, [cart]);

  const packagingFee = useMemo(() => {
    if (!includePackagingFee || cart.length === 0) return 0;
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
    return Math.min(totalQty * 10, 50); // ₹10 per item, capped at ₹50
  }, [includePackagingFee, cart]);

  const cartTax = useMemo(() => {
    return ((cartSubtotal + packagingFee) * taxRate) / 100;
  }, [cartSubtotal, packagingFee, taxRate]);

  const cartTotal = useMemo(() => {
    return cartSubtotal + packagingFee + cartTax;
  }, [cartSubtotal, packagingFee, cartTax]);

  // ----------------------------------------------------
  // CART ACTIONS
  // ----------------------------------------------------
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.menuItem.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { menuItem: item, quantity: 1, specialInstructions: "" }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.menuItem.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleUpdateItemInstructions = (itemId: string, instructions: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.menuItem.id === itemId ? { ...item, specialInstructions: instructions } : item
      )
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setOrderNotes("");
    generateNewToken();
  };

  // ----------------------------------------------------
  // SEND PARCEL TO KITCHEN
  // ----------------------------------------------------
  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      toast.error("Please add at least 1 item to the parcel order");
      return;
    }

    const finalCustomerName = customerName.trim() || "Walk-in Guest";
    const finalToken = tokenNumber.trim() || `P-${Math.floor(100 + Math.random() * 900)}`;

    setIsSubmittingOrder(true);
    try {
      // 1. Create Takeaway Order
      const payload = {
        restaurantId,
        type: "TAKEAWAY",
        groupName: `${finalToken} • ${finalCustomerName}`,
        customerName: finalCustomerName,
        customerPhone: customerPhone.trim() || undefined,
        partyLabel: "P",
        items: cart.map((i) => ({
          menuItemId: i.menuItem.id,
          quantity: i.quantity,
          specialInstructions: [
            i.specialInstructions?.trim() ? `[Item: ${i.specialInstructions.trim()}]` : "",
            orderNotes.trim() ? `[Order: ${orderNotes.trim()}]` : "",
            includePackagingFee ? "PARCEL PACKAGING" : "",
          ]
            .filter(Boolean)
            .join(" "),
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create parcel order");
      }

      const createdOrder: ParcelOrder = json.data;

      // 2. If Paid Upfront, Settle via Billing
      if (paymentOption !== "PAY_ON_PICKUP") {
        const method = paymentOption.replace("PAID_", "");
        await fetch("/api/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: createdOrder.id,
            amount: createdOrder.total,
            method,
          }),
        });
      }

      toast.success(`🔥 Parcel ${finalToken} sent to Kitchen KDS!`);

      // Refresh orders and switch to tracker
      fetchParcelOrders();
      setPrintOrder(createdOrder);
      handleClearCart();
      setActiveTab("tracker");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit parcel order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ----------------------------------------------------
  // TRACKER ACTIONS (KITCHEN & HANDOVER)
  // ----------------------------------------------------
  const handleUpdateOrderStatus = async (orderId: string, status: string, label: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Parcel updated to "${label}"!`);
        fetchParcelOrders();
      } else {
        toast.error(json.error || "Failed to update parcel status");
      }
    } catch {
      toast.error("Network error updating status");
    }
  };

  const handleSettleOrder = async () => {
    if (!settleOrderTarget) return;
    setIsSettling(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: settleOrderTarget.id,
          amount: settleOrderTarget.total,
          method: settleMethod,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Payment of ${currency}${settleOrderTarget.total.toFixed(2)} received!`);
        setSettleOrderTarget(null);
        fetchParcelOrders();
      } else {
        toast.error(json.error || "Failed to process billing");
      }
    } catch {
      toast.error("Error processing settlement");
    } finally {
      setIsSettling(false);
    }
  };

  // Filtered Tracker Orders
  const filteredTrackerOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      if (trackerSearch.trim()) {
        const q = trackerSearch.toLowerCase();
        const matchToken = o.groupName?.toLowerCase().includes(q);
        const matchCust = o.customer?.name?.toLowerCase().includes(q);
        const matchPhone = o.customer?.phone?.includes(q);
        const matchItems = o.items?.some((i) => i.menuItem?.name?.toLowerCase().includes(q));
        if (!matchToken && !matchCust && !matchPhone && !matchItems) return false;
      }

      // Status Filter
      if (trackerFilter === "KITCHEN") {
        return ["PLACED", "CONFIRMED", "PREPARING"].includes(o.status);
      }
      if (trackerFilter === "READY") {
        return o.status === "READY";
      }
      if (trackerFilter === "COMPLETED") {
        return o.status === "COMPLETED";
      }
      return true;
    });
  }, [orders, trackerSearch, trackerFilter]);

  const getElapsedTime = (createdAt: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins > 60) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    return `${diffMins}m ago`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* ==================================================== */}
      {/* 1. TOP METRICS RIBBON */}
      {/* ==================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today&apos;s Parcels</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalToday}</span>
            <span className="text-xs text-slate-400 font-medium">orders</span>
          </div>
        </div>

        {/* In Kitchen */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">In Kitchen</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <ChefHat className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600">{stats.inKitchen}</span>
            <span className="text-xs text-slate-400 font-medium">cooking</span>
          </div>
        </div>

        {/* Ready For Pickup */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-2xs relative overflow-hidden">
          {stats.readyForPickup > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 animate-pulse" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Ready for Pickup</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <BellRing className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">{stats.readyForPickup}</span>
            <span className="text-xs text-emerald-600/80 font-bold">packed & ready</span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Handed Over</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.completed}</span>
            <span className="text-xs text-slate-400 font-medium">completed</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. SECTION TABS */}
      {/* ==================================================== */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "pos" | "tracker")}
        className="w-full space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl h-11 border border-slate-200/60 dark:border-slate-800">
            <TabsTrigger
              value="pos"
              className="rounded-xl px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              <span>⚡ Take New Parcel</span>
            </TabsTrigger>
            <TabsTrigger
              value="tracker"
              className="rounded-xl px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white transition-all flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4 text-indigo-500" />
              <span>📋 Live Kitchen Tracker</span>
              {stats.readyForPickup > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              fetchParcelOrders();
            }}
            disabled={isRefreshing}
            className="text-xs text-slate-500 rounded-xl h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefreshing && "animate-spin")} />
            Sync
          </Button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: NEW PARCEL ORDER (POS MODE) */}
        {/* ==================================================== */}
        <TabsContent value="pos" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left: Customer Info & Menu Browser (Cols 7 or 8) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Customer Header Box */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 flex items-center justify-center font-black text-xs">
                      {tokenNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Parcel Token & Customer</h4>
                      <p className="text-[11px] text-slate-400">Directly printed on parcel and kitchen tickets</p>
                    </div>
                  </div>

                  <button
                    onClick={generateNewToken}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    Change Token
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Customer Name (e.g. Rahul, Priya)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      placeholder="Customer Phone (optional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="General Packaging Instructions (e.g. Separate packaging, less spicy, extra cutlery)"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Menu Browser Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xs space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search menu dishes to pack..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    {menuSearch && (
                      <button
                        onClick={() => setMenuSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dietary Toggle Filter */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 shrink-0">
                    <button
                      onClick={() => setSelectedType("ALL")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                        selectedType === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedType("Veg")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                        selectedType === "Veg" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-600"
                      )}
                    >
                      <Leaf className="w-3 h-3" /> Veg
                    </button>
                    <button
                      onClick={() => setSelectedType("Non-Veg")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
                        selectedType === "Non-Veg" ? "bg-rose-600 text-white shadow-xs" : "text-rose-600"
                      )}
                    >
                      <Flame className="w-3 h-3" /> Non-Veg
                    </button>
                  </div>
                </div>

                {/* Category Horizontal Scrolling Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory("ALL")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                      selectedCategory === "ALL"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    All Items ({allMenuItems.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                        selectedCategory === cat.id
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {cat.name} ({cat.items.filter((i) => i.isAvailable).length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredMenuItems.map((item) => {
                  const cartItem = cart.find((i) => i.menuItem.id === item.id);
                  const isVeg = item.type?.toLowerCase() === "veg";

                  return (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs flex flex-col justify-between hover:border-slate-400 transition-all space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5",
                                isVeg ? "border-emerald-600 bg-emerald-50" : "border-rose-600 bg-rose-50"
                              )}
                            >
                              <div
                                className={cn(
                                  "rounded-full",
                                  isVeg ? "w-2 h-2 bg-emerald-600" : "w-2 h-2 bg-rose-600"
                                )}
                              />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-slate-900 dark:text-white block leading-snug">
                                {item.name}
                              </span>
                              {item.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          {currency}{item.price.toFixed(2)}
                        </span>

                        {cartItem ? (
                          <div className="flex items-center gap-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl px-2 py-1">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="p-1 hover:bg-white/20 rounded-lg active:scale-90"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black px-1.5">{cartItem.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="p-1 hover:bg-white/20 rounded-lg active:scale-90"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-900 dark:bg-slate-800 dark:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-xl text-xs font-bold h-8 px-3 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Parcel Cart Panel (Cols 5 or 4) */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden sticky top-20 flex flex-col max-h-[calc(100vh-100px)]">
                {/* Cart Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Parcel Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
                      </h3>
                      <span className="text-xs font-mono font-semibold text-slate-500">
                        {tokenNumber} • {customerName.trim() || "Walk-in Guest"}
                      </span>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCart}
                      className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl h-8 px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Cart Items Scroll Area */}
                <div className="p-4 space-y-3 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">
                            {item.menuItem.name}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">
                            {currency}{item.menuItem.price.toFixed(2)} each
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                            <button
                              onClick={() => handleUpdateQuantity(item.menuItem.id, -1)}
                              className="p-1 text-slate-600 hover:text-slate-900 active:scale-90"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black px-2">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateQuantity(item.menuItem.id, 1)}
                              className="p-1 text-slate-600 hover:text-slate-900 active:scale-90"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white w-14 text-right">
                            {currency}{(item.menuItem.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Custom Packing Note for item */}
                      <input
                        type="text"
                        placeholder="Item note (e.g. Less spicy, gravy separate)"
                        value={item.specialInstructions || ""}
                        onChange={(e) => handleUpdateItemInstructions(item.menuItem.id, e.target.value)}
                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  ))}

                  {cart.length === 0 && (
                    <div className="text-center py-10 text-slate-400 space-y-2">
                      <Package className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        No dishes added to parcel yet
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Click on any dish to add to this parcel package.
                      </p>
                    </div>
                  )}
                </div>

                {/* Cart Footer / Bill Calculation */}
                {cart.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Packaging Fee Toggle */}
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={includePackagingFee}
                          onChange={(e) => setIncludePackagingFee(e.target.checked)}
                          className="rounded text-slate-900 focus:ring-slate-900 w-4 h-4"
                        />
                        <span>Add Parcel Container Fee</span>
                      </label>
                      <span className="font-bold">{currency}{packagingFee.toFixed(2)}</span>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-1 text-xs text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span>{currency}{cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST / Tax ({taxRate}%)</span>
                        <span>{currency}{cartTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span>Grand Total</span>
                        <span className="text-base text-emerald-600 dark:text-emerald-400">
                          {currency}{cartTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Payment Mode Selector */}
                    <div>
                      <span className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                        Payment Status
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setPaymentOption("PAY_ON_PICKUP")}
                          className={cn(
                            "py-2 px-2.5 rounded-xl border text-center font-bold transition-all",
                            paymentOption === "PAY_ON_PICKUP"
                              ? "bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-white dark:bg-slate-800 border-slate-200 text-slate-600"
                          )}
                        >
                          🕒 Pay at Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentOption("PAID_UPI")}
                          className={cn(
                            "py-2 px-2.5 rounded-xl border text-center font-bold transition-all",
                            paymentOption.startsWith("PAID")
                              ? "bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-white dark:bg-slate-800 border-slate-200 text-slate-600"
                          )}
                        >
                          ✅ Paid Now (UPI/Cash)
                        </button>
                      </div>
                    </div>

                    {/* Big Action: SEND TO KITCHEN */}
                    <Button
                      onClick={handleSendToKitchen}
                      disabled={isSubmittingOrder}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 py-3.5 h-12 rounded-2xl font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending to Kitchen...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Parcel to Kitchen (KDS) 🔥
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 2: ACTIVE PARCELS & KITCHEN TRACKER */}
        {/* ==================================================== */}
        <TabsContent value="tracker" className="focus-visible:outline-none space-y-4">
          {/* Tracker Filters */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search token, customer name, phone..."
                value={trackerSearch}
                onChange={(e) => setTrackerSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {trackerSearch && (
                <button
                  onClick={() => setTrackerSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Status Pills */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setTrackerFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  trackerFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                )}
              >
                All ({orders.length})
              </button>
              <button
                onClick={() => setTrackerFilter("KITCHEN")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1",
                  trackerFilter === "KITCHEN"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 hover:bg-amber-100"
                )}
              >
                <ChefHat className="w-3.5 h-3.5" /> In Kitchen ({stats.inKitchen})
              </button>
              <button
                onClick={() => setTrackerFilter("READY")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1",
                  trackerFilter === "READY"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 hover:bg-emerald-100"
                )}
              >
                <BellRing className="w-3.5 h-3.5" /> Ready to Hand Over ({stats.readyForPickup})
              </button>
              <button
                onClick={() => setTrackerFilter("COMPLETED")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  trackerFilter === "COMPLETED"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                )}
              >
                Handed Over ({stats.completed})
              </button>
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTrackerOrders.map((order) => {
              const isCooking = ["PLACED", "CONFIRMED", "PREPARING"].includes(order.status);
              const isReady = order.status === "READY";
              const isDone = order.status === "COMPLETED";
              const isPaid = order.paymentStatus === "PAID";
              const elapsed = getElapsedTime(order.createdAt);

              return (
                <div
                  key={order.id}
                  className={cn(
                    "bg-white dark:bg-slate-900 border rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-xs transition-all space-y-4",
                    isReady
                      ? "border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/10"
                      : isCooking
                      ? "border-amber-300 dark:border-amber-900/60"
                      : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-lg text-slate-900 dark:text-white">
                          {order.groupName || `Parcel #${order.id.slice(-4).toUpperCase()}`}
                        </span>

                        {isReady && (
                          <span className="bg-emerald-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full animate-pulse uppercase">
                            🛎️ READY FOR PACKING!
                          </span>
                        )}

                        {isCooking && (
                          <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                            👨‍🍳 Cooking in Kitchen
                          </span>
                        )}

                        {isDone && (
                          <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                            ✅ Handed Over
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        {order.customer?.name && <span>{order.customer.name}</span>}
                        {order.customer?.phone && <span>• {order.customer.phone}</span>}
                        <span>• #{order.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-600 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{elapsed}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 py-1 flex-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between text-xs sm:text-sm">
                        <div className="flex items-start gap-2">
                          <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded-md">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.menuItem?.name || "Dish Item"}
                            </span>
                            {item.specialInstructions && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                                {item.specialInstructions}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-slate-500">
                          {currency}{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment & Amount Summary */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Bill</span>
                      <span className="font-black text-base text-slate-900 dark:text-white">
                        {currency}{order.total.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      {isPaid ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px] font-bold">
                          ✅ PAID
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-bold">
                          🕒 Payment Pending
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPrintOrder(order)}
                      className="rounded-xl text-xs font-semibold h-10 px-3"
                      title="Print KOT / Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>

                    {!isPaid && !isDone && (
                      <Button
                        size="sm"
                        onClick={() => setSettleOrderTarget(order)}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold h-10"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" /> Settle {currency}{order.total.toFixed(2)}
                      </Button>
                    )}

                    {isReady && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED", "Handed Over")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-10 shadow-xs active:scale-95"
                      >
                        <Check className="w-4 h-4 mr-1" /> Mark Handed Over ✅
                      </Button>
                    )}

                    {isCooking && isPaid && (
                      <div className="flex-1 text-center py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-500">
                        Kitchen is cooking... 👨‍🍳
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredTrackerOrders.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                <Package className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="font-bold text-slate-700 dark:text-slate-200">No parcel tickets in this view</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Take a new parcel order from the &quot;⚡ Take New Parcel&quot; tab to send tickets to the kitchen.
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("pos")}
                  className="bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create Parcel Order
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================================================== */}
      {/* 3. MODAL: SETTLE PAYMENT */}
      {/* ==================================================== */}
      {settleOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Collect Parcel Payment</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {settleOrderTarget.groupName || `#${settleOrderTarget.id.slice(-6)}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSettleOrderTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase">Amount Due</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {currency}{settleOrderTarget.total.toFixed(2)}
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "UPI", label: "UPI / QR", icon: <QrCode className="w-4 h-4 text-indigo-600" /> },
                  { id: "CASH", label: "Cash", icon: <Banknote className="w-4 h-4 text-emerald-600" /> },
                  { id: "CARD", label: "Card", icon: <CreditCard className="w-4 h-4 text-blue-600" /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettleMethod(m.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition-all gap-1.5",
                      settleMethod === m.id
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 border-slate-200"
                    )}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setSettleOrderTarget(null)}
                disabled={isSettling}
                className="flex-1 rounded-xl text-xs font-semibold h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSettleOrder}
                disabled={isSettling}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-11"
              >
                {isSettling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Processing...
                  </>
                ) : (
                  `Confirm ${currency}${settleOrderTarget.total.toFixed(2)} Paid`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. MODAL: PRINT PARCEL KOT / SLIP */}
      {/* ==================================================== */}
      {printOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Slip Header */}
            <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
              <span className="text-lg font-black tracking-tight block">{restaurantName}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                📦 PARCEL KOT &amp; BILL
              </span>
              <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {printOrder.groupName || `TOKEN #${printOrder.id.slice(-4).toUpperCase()}`}
              </div>
              <span className="text-[11px] text-slate-400 font-mono block">
                {new Date(printOrder.createdAt).toLocaleTimeString()} • {new Date(printOrder.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2 text-xs font-mono border-b border-dashed border-slate-300 dark:border-slate-700 pb-3">
              {printOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <span>{item.quantity}x {item.menuItem?.name}</span>
                    {item.specialInstructions && (
                      <p className="text-[10px] text-slate-500 italic pl-3">{item.specialInstructions}</p>
                    )}
                  </div>
                  <span className="font-bold">{currency}{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{currency}{printOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{currency}{printOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200">
                <span>Total</span>
                <span>{currency}{printOrder.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPrintOrder(null)}
                className="flex-1 rounded-xl text-xs font-semibold h-10"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  window.print();
                  setPrintOrder(null);
                }}
                className="flex-1 bg-slate-900 text-white rounded-xl text-xs font-bold h-10"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
