"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Utensils, Users, Clock, ShoppingBag, Bell, Droplets, 
  Receipt, ChefHat, CheckCircle2, ArrowRight, Plus, Minus, 
  Search, X, Sparkles, Phone, Ticket, ShieldCheck, 
  Flame, Heart, Info, ChevronRight, LogOut, Moon, Sun, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string; // 'Veg' | 'Non-Veg'
  image: string | null;
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  orderIndex: number;
  items: MenuItem[];
};

export type StatusData = {
  state: "NONE" | "WAITING" | "CALLED" | "SEATED";
  queue: {
    id: string;
    tokenNumber: string;
    status: string;
    guests?: number;
    position: number;
    estimatedWaitMins: number;
  } | null;
  table: {
    tableId: string;
    tableNumber: string;
    orderStatus: string;
    orderId: string;
    total: number;
    items: { name: string; quantity: number; price: number }[];
  } | null;
};

interface CustomerAppViewProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    address?: string | null;
    phone?: string | null;
    settings?: any;
  };
  categories: MenuCategory[];
  customerName: string;
  customerPhone?: string;
  currency: string;
}

export function CustomerAppView({
  restaurant,
  categories,
  customerName,
  customerPhone,
  currency = "₹"
}: CustomerAppViewProps) {
  // App Navigation Tabs: 'menu' | 'status' | 'bill' | 'service'
  const [activeTab, setActiveTab] = useState<"menu" | "status" | "bill" | "service">("menu");

  // Status & Polling
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Cart State: { [menuItemId]: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("ALL");
  const [vegOnly, setVegOnly] = useState(false);

  // Join Queue Form
  const [guestsCount, setGuestsCount] = useState(2);
  const [queuePreference, setQueuePreference] = useState("");
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);

  // Theme State
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains("dark");
    setIsDark(isDarkTheme);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  // Poll live status every 4s
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/status");
      if (res.ok) {
        const json = await res.json();
        setStatusData(json.data);
      }
    } catch (err) {
      console.error("Status fetch error:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Cart Management
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const allItems = categories.flatMap(c => c.items);
  const getItem = (id: string) => allItems.find(i => i.id === id);

  const cartEntries = Object.entries(cart).map(([id, qty]) => ({
    item: getItem(id)!,
    quantity: qty
  })).filter(e => e.item);

  const cartItemsCount = cartEntries.reduce((sum, e) => sum + e.quantity, 0);
  const cartSubtotal = cartEntries.reduce((sum, e) => sum + (e.item.price * e.quantity), 0);
  const taxRate = restaurant.settings?.tax || 5;
  const taxAmount = Math.round((cartSubtotal * (taxRate / 100)) * 100) / 100;
  const cartTotal = cartSubtotal + taxAmount;

  // Place Order
  const handlePlaceOrder = async () => {
    if (cartItemsCount === 0) return;
    setIsOrdering(true);

    try {
      const payload = {
        restaurantId: restaurant.id,
        tableId: statusData?.table?.tableId,
        type: "DINE_IN",
        items: cartEntries.map(e => ({
          menuItemId: e.item.id,
          quantity: e.quantity,
          specialInstructions: specialInstructions || undefined
        }))
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        toast.success("🍽️ Order sent to kitchen!");
        setCart({});
        setSpecialInstructions("");
        setIsCartOpen(false);
        setOrderSuccessModal(true);
        fetchStatus();
      } else {
        toast.error(json.error || "Failed to place order");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setIsOrdering(false);
    }
  };

  // Join Queue
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoiningQueue(true);
    try {
      const res = await fetch("/api/customer/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: guestsCount, preference: queuePreference }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("🎟️ Joined waitlist successfully!");
        fetchStatus();
      } else {
        toast.error(json.error || "Failed to join queue");
      }
    } catch (err) {
      toast.error("Error joining waitlist");
    } finally {
      setIsJoiningQueue(false);
    }
  };

  // Service Quick Actions
  const handleCallService = async (actionName: string, icon: string) => {
    const tableId = statusData?.table?.tableId;

    if (!tableId) {
      toast.error("Please ensure you are assigned to a table to request table service.");
      return;
    }

    let reqType = "CALL_WAITER";
    let notes: string | undefined = undefined;

    if (actionName.toLowerCase().includes("water")) {
      reqType = "WATER";
    } else if (actionName.toLowerCase().includes("bill")) {
      reqType = "REQUEST_BILL";
    } else if (actionName.toLowerCase().includes("clean")) {
      reqType = "CLEANING";
    } else if (actionName.toLowerCase().includes("cutlery") || actionName.toLowerCase().includes("plate")) {
      reqType = "OTHER";
      notes = "Extra Cutlery & Napkins";
    }

    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId,
          type: reqType,
          notes
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`${icon} ${actionName} requested! Staff will arrive at Table ${statusData.table?.tableNumber} shortly.`);
      } else {
        toast.error(json.error || "Failed to notify staff");
      }
    } catch (err) {
      toast.error("Network error requesting service");
    }
  };

  // Filter items
  const filteredCategories = categories.map(cat => {
    if (selectedCatId !== "ALL" && cat.id !== selectedCatId) return null;

    const items = cat.items.filter(item => {
      if (vegOnly && item.type !== "Veg") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      }
      return true;
    });

    if (items.length === 0) return null;
    return { ...cat, items };
  }).filter(Boolean) as MenuCategory[];

  const isSeated = statusData?.state === "SEATED" && statusData.table;
  const isWaitingInQueue = statusData?.state === "WAITING" || statusData?.state === "CALLED";

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative border-x border-stone-200 dark:border-zinc-800">
      
      {/* ─── 1. APP HEADER BAR ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-stone-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-amber-500/20">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-zinc-900 dark:text-white leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {customerName ? `Hi, ${customerName}` : "Guest Diner"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {isSeated && (
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Table {statusData.table!.tableNumber}
            </span>
          )}

          {isWaitingInQueue && (
            <span className="bg-amber-500 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Token {statusData.queue?.tokenNumber}
            </span>
          )}

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-stone-200 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: `/${restaurant.slug}/login` })}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
            title="Exit / Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN APP CONTENT CONTAINER ────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
        
        {/* TAB 1: MENU & ORDERING */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            
            {/* Seated Table Banner */}
            {isSeated ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-15">
                  <Utensils className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <span className="bg-white/20 backdrop-blur-md text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Seated at Table {statusData.table!.tableNumber}
                    </span>
                    <h2 className="text-xl font-black mt-1">Ready to Order</h2>
                    <p className="text-xs text-emerald-100 mt-0.5">Dishes ordered will be sent directly to your table.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("bill")}
                    className="bg-white text-emerald-900 font-extrabold text-xs px-3 py-2 rounded-xl shadow-md active:scale-95 transition-transform"
                  >
                    View Bill →
                  </button>
                </div>
              </div>
            ) : isWaitingInQueue ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="bg-white/20 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                      Waitlist Token #{statusData.queue?.tokenNumber}
                    </span>
                    <h2 className="text-xl font-black mt-1">Pre-select Your Dishes</h2>
                    <p className="text-xs text-amber-100 mt-0.5">Browse and prepare your order while waiting for your table.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab("status")}
                    className="bg-white text-orange-950 font-extrabold text-xs px-3 py-2 rounded-xl shadow-md active:scale-95 transition-transform"
                  >
                    Wait Status
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-amber-400">Join the Waitlist</h3>
                  <p className="text-xs text-zinc-300">Get your queue token before you arrive.</p>
                </div>
                <button
                  onClick={() => setActiveTab("status")}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md active:scale-95"
                >
                  Get Token →
                </button>
              </div>
            )}

            {/* Sticky Search & Veg Filter */}
            <div className="sticky top-14 z-20 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur-md py-2 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <Input
                    placeholder="Search delicious food & drinks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 shadow-2xs"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setVegOnly(!vegOnly)}
                  className={`px-3 h-9 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                    vegOnly 
                      ? "bg-emerald-600 text-white shadow-xs" 
                      : "bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${vegOnly ? "bg-white" : "bg-emerald-500"}`} />
                  <span>Veg</span>
                </button>
              </div>

              {/* Horizontal Category Slider */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCatId("ALL")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                    selectedCatId === "ALL"
                      ? "bg-amber-500 text-zinc-950 shadow-xs scale-[1.02]"
                      : "bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                      selectedCatId === cat.id
                        ? "bg-amber-500 text-zinc-950 shadow-xs scale-[1.02]"
                        : "bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="space-y-6">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 text-stone-400">
                  <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No dishes found</p>
                  <p className="text-xs mt-1">Try another search keyword</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif font-bold text-lg text-amber-600 dark:text-amber-400 tracking-wide">
                        {category.name}
                      </h2>
                      <span className="text-[10px] text-zinc-400 font-semibold">{category.items.length} dishes</span>
                    </div>

                    <div className="space-y-2.5">
                      {category.items.map((item) => {
                        const qtyInCart = cart[item.id] || 0;

                        return (
                          <div
                            key={item.id}
                            className={`bg-white dark:bg-zinc-900 border rounded-2xl p-3.5 transition-all shadow-2xs flex items-center justify-between gap-3 ${
                              qtyInCart > 0 
                                ? "border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-400/40" 
                                : "border-stone-200 dark:border-zinc-800 hover:border-amber-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 mb-1">
                                {item.type === "Veg" ? (
                                  <span className="w-3.5 h-3.5 border-2 border-emerald-600 flex items-center justify-center p-[1px] rounded-xs shrink-0">
                                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                                  </span>
                                ) : (
                                  <span className="w-3.5 h-3.5 border-2 border-rose-600 flex items-center justify-center p-[1px] rounded-xs shrink-0">
                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                                  </span>
                                )}
                                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                  {item.name}
                                </h3>
                              </div>

                              {item.description && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                  {item.description}
                                </p>
                              )}

                              <div className="font-bold font-serif text-amber-600 dark:text-amber-400 text-sm mt-1">
                                {currency}{item.price}
                              </div>
                            </div>

                            {/* Stepper Button */}
                            <div className="shrink-0">
                              {qtyInCart === 0 ? (
                                <Button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  size="sm"
                                  className="h-8 px-3.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-xs active:scale-90 transition-transform"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1 font-extrabold" /> ADD
                                </Button>
                              ) : (
                                <div className="flex items-center space-x-1.5 bg-amber-500 text-zinc-950 rounded-xl px-2 py-1 shadow-xs">
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="p-1 hover:bg-amber-600 rounded-lg active:scale-75"
                                  >
                                    <Minus className="w-3 h-3 font-black" />
                                  </button>
                                  <span className="font-black text-xs min-w-[16px] text-center">
                                    {qtyInCart}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="p-1 hover:bg-amber-600 rounded-lg active:scale-75"
                                  >
                                    <Plus className="w-3 h-3 font-black" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE STATUS & WAITLIST */}
        {activeTab === "status" && (
          <div className="space-y-4">
            
            {/* Seated Table View */}
            {isSeated ? (
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-white/20 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    You Are Seated
                  </span>
                  <Utensils className="w-6 h-6 text-emerald-200" />
                </div>

                <div>
                  <h2 className="text-3xl font-black">Table {statusData.table!.tableNumber}</h2>
                  <p className="text-emerald-100 text-xs mt-1">
                    Your dine-in table is active. You can order dishes anytime from the menu.
                  </p>
                </div>

                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-200">Kitchen Order Status</span>
                    <p className="font-black text-base">{statusData.table!.orderStatus.replace('_', ' ')}</p>
                  </div>
                  <span className="text-sm font-extrabold bg-white text-emerald-950 px-3 py-1 rounded-xl">
                    {currency}{statusData.table!.total}
                  </span>
                </div>

                <Button
                  onClick={() => setActiveTab("menu")}
                  className="w-full bg-white text-emerald-950 font-black h-11 rounded-2xl hover:bg-emerald-50"
                >
                  Browse Menu & Add Dishes →
                </Button>
              </div>
            ) : isWaitingInQueue ? (
              
              /* Waiting in Line Tracker */
              <div className="space-y-4">
                <div className={`rounded-3xl p-6 text-white shadow-xl ${
                  statusData.queue?.status === "CALLED"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700 animate-pulse"
                    : "bg-gradient-to-br from-amber-500 to-orange-600"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-white/20 text-xs font-black px-3 py-1 rounded-full uppercase">
                      {statusData.queue?.status === "CALLED" ? "📢 Table Ready!" : "In Waitlist Line"}
                    </span>
                    <Ticket className="w-6 h-6 text-white/80" />
                  </div>

                  <div className="text-center py-2">
                    <p className="text-xs uppercase font-bold tracking-widest text-white/80">Your Token Number</p>
                    <h2 className="text-5xl font-black tracking-tight my-1">{statusData.queue?.tokenNumber}</h2>
                    <p className="text-xs text-white/90 mt-1">
                      {statusData.queue?.status === "CALLED"
                        ? "Please proceed to the host desk to be seated!"
                        : "Please wait in the lobby area."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/20 text-center">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <span className="text-[10px] text-white/80 uppercase font-bold block">Position</span>
                      <span className="text-xl font-black">#{statusData.queue?.position || 1}</span>
                    </div>
                    <div className="p-2 bg-white/10 rounded-xl">
                      <span className="text-[10px] text-white/80 uppercase font-bold block">Est. Wait</span>
                      <span className="text-xl font-black">~{statusData.queue?.estimatedWaitMins || 10}m</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-stone-200 dark:border-zinc-800 text-center space-y-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    While you wait, you can build your cart so dishes can be prepared the moment you sit down.
                  </p>
                  <Button onClick={() => setActiveTab("menu")} className="bg-amber-500 text-zinc-950 font-bold w-full rounded-xl">
                    Pre-select Menu Items
                  </Button>
                </div>
              </div>
            ) : (
              
              /* Join Queue Form */
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-stone-200 dark:border-zinc-800 shadow-md space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Join the Waitlist</h2>
                  <p className="text-xs text-zinc-500">Secure your table in line instantly.</p>
                </div>

                <form onSubmit={handleJoinQueue} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">How many guests in your party?</Label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 4, 6, 8].map(count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setGuestsCount(count)}
                          className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm border transition-all ${
                            guestsCount === count
                              ? "bg-amber-500 border-amber-500 text-zinc-950 shadow-xs"
                              : "bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Seating Preference (Optional)</Label>
                    <Input
                      placeholder="e.g. Indoor, Window, High Chair"
                      value={queuePreference}
                      onChange={(e) => setQueuePreference(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isJoiningQueue}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black h-12 rounded-2xl text-sm shadow-md"
                  >
                    {isJoiningQueue ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ticket className="w-4 h-4 mr-2" />}
                    Get Waitlist Token
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE BILL & ACTIVE ORDERS */}
        {activeTab === "bill" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <h2 className="font-extrabold text-base text-zinc-900 dark:text-white">Live Table Bill</h2>
                </div>
                {isSeated && (
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                    Table {statusData.table!.tableNumber}
                  </span>
                )}
              </div>

              {isSeated && statusData.table?.items && statusData.table.items.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {statusData.table.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-stone-100 dark:border-zinc-800/60">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-amber-600">{item.quantity}x</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
                        </div>
                        <span className="font-bold font-serif text-zinc-900 dark:text-zinc-100">
                          {currency}{item.price * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-500">
                      <span>Live Total</span>
                      <span className="font-bold font-serif text-sm text-zinc-900 dark:text-white">
                        {currency}{statusData.table.total}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button 
                      onClick={() => handleCallService("Bill", "💳")}
                      className="flex-1 bg-amber-500 text-zinc-950 font-bold h-10 rounded-xl"
                    >
                      Request Final Bill
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("menu")}
                      variant="outline"
                      className="flex-1 h-10 rounded-xl font-bold"
                    >
                      Order More Dishes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">No placed orders on this table yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: GUEST SERVICES & CALL WAITER */}
        {activeTab === "service" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-stone-100 dark:border-zinc-800">
                <Bell className="w-5 h-5 text-amber-500" />
                <h2 className="font-extrabold text-base text-zinc-900 dark:text-white">Staff & Table Services</h2>
              </div>

              <p className="text-xs text-zinc-500">
                Need anything at your table? Tap below and our floor staff will attend to you right away.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleCallService("Waiter", "🛎️")}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 hover:border-amber-400 flex flex-col items-center text-center transition-all active:scale-95"
                >
                  <Bell className="w-6 h-6 text-amber-500 mb-1.5" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Call Waiter</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Assistance at table</span>
                </button>

                <button
                  onClick={() => handleCallService("Water Refill", "💧")}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 hover:border-blue-400 flex flex-col items-center text-center transition-all active:scale-95"
                >
                  <Droplets className="w-6 h-6 text-blue-500 mb-1.5" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Water Refill</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Drinking water</span>
                </button>

                <button
                  onClick={() => handleCallService("Extra Cutlery & Napkins", "🍴")}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 hover:border-emerald-400 flex flex-col items-center text-center transition-all active:scale-95"
                >
                  <Utensils className="w-6 h-6 text-emerald-500 mb-1.5" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Cutlery / Plates</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Spoons, forks & tissues</span>
                </button>

                <button
                  onClick={() => handleCallService("Bill & Payment", "💳")}
                  className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-800/60 border border-stone-200 dark:border-zinc-700 hover:border-purple-400 flex flex-col items-center text-center transition-all active:scale-95"
                >
                  <Receipt className="w-6 h-6 text-purple-500 mb-1.5" />
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Get Bill</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">UPI, Cash or Card</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. FLOATING CART PILL (WHEN ITEMS IN CART) ───────────── */}
      {cartItemsCount > 0 && activeTab === "menu" && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-zinc-950 text-white rounded-2xl p-3.5 px-4 shadow-2xl border border-zinc-700 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="font-black text-xs">{cartItemsCount} {cartItemsCount === 1 ? "Item" : "Items"}</span>
                {isSeated && (
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    Table {statusData.table!.tableNumber}
                  </span>
                )}
              </div>
              <p className="text-amber-400 font-serif font-black text-sm mt-0.5">
                {currency}{cartTotal}
              </p>
            </div>

            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs px-4 h-9 rounded-xl shadow-md active:scale-95 transition-all flex items-center"
            >
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ─── 4. BOTTOM APP NAVIGATION BAR (NATIVE APP STYLE) ─────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-stone-200 dark:border-zinc-800 max-w-md mx-auto py-1 px-3 shadow-lg">
        <div className="flex items-center justify-around">
          
          {/* Tab: Menu */}
          <button
            onClick={() => setActiveTab("menu")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "menu"
                ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                : "text-zinc-400 hover:text-zinc-600 font-medium"
            }`}
          >
            <Utensils className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Menu</span>
          </button>

          {/* Tab: Status */}
          <button
            onClick={() => setActiveTab("status")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative ${
              activeTab === "status"
                ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                : "text-zinc-400 hover:text-zinc-600 font-medium"
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Waitlist</span>
            {isWaitingInQueue && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-3 animate-ping" />
            )}
          </button>

          {/* Tab: Live Tab / Bill */}
          <button
            onClick={() => setActiveTab("bill")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "bill"
                ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                : "text-zinc-400 hover:text-zinc-600 font-medium"
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">My Bill</span>
          </button>

          {/* Tab: Service */}
          <button
            onClick={() => setActiveTab("service")}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              activeTab === "service"
                ? "text-amber-600 dark:text-amber-400 font-bold scale-105"
                : "text-zinc-400 hover:text-zinc-600 font-medium"
            }`}
          >
            <Bell className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Service</span>
          </button>
        </div>
      </div>

      {/* ─── 5. CART / CHECKOUT REVIEW MODAL ───────────────────────── */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <span>Review Your Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isSeated ? (
                <span>Sending to <strong>Table {statusData.table!.tableNumber}</strong></span>
              ) : (
                <span>Dine-In Order for <strong>{customerName || "Guest"}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 max-h-72 overflow-y-auto">
            {cartEntries.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-stone-50 dark:bg-zinc-800/60 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs">
                <div className="flex-1 pr-2 truncate">
                  <p className="font-bold text-zinc-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-amber-600 font-serif">{currency}{item.price}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-white dark:bg-zinc-900 border rounded-lg px-2 py-0.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-stone-600 hover:text-black">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold px-1">{quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-stone-600 hover:text-black">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-bold font-serif min-w-[45px] text-right">
                    {currency}{item.price * quantity}
                  </span>
                </div>
              </div>
            ))}

            <div className="space-y-1">
              <Label htmlFor="custNotes" className="text-xs font-semibold">Special Request / Cooking Notes:</Label>
              <Input
                id="custNotes"
                placeholder="e.g. Less spicy, serve hot, extra tissues"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="h-8 text-xs rounded-xl"
              />
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>{currency}{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Tax ({taxRate}%)</span>
                <span>{currency}{taxAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-white pt-1 border-t">
                <span>Total</span>
                <span className="text-amber-600 font-serif">{currency}{cartTotal}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsCartOpen(false)}>Add More</Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={isOrdering || cartItemsCount === 0}
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black"
            >
              {isOrdering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <span>Send to Kitchen</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 6. ORDER RECEIVED SUCCESS POPUP ──────────────────────── */}
      <Dialog open={orderSuccessModal} onOpenChange={setOrderSuccessModal}>
        <DialogContent className="sm:max-w-xs text-center py-6">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <DialogTitle className="text-lg font-black">Order Placed!</DialogTitle>
          <DialogDescription className="text-xs mt-1">
            Your dishes have been transmitted directly to the kitchen chefs. Enjoy your meal!
          </DialogDescription>
          <div className="mt-4">
            <Button onClick={() => setOrderSuccessModal(false)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 rounded-xl">
              Great!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
