"use client";

import React, { useState, useMemo } from "react";
import { 
  UtensilsCrossed, Search, Plus, Minus, ShoppingBag, 
  ChefHat, Trash2, Edit3, ArrowRight, CheckCircle2, 
  Armchair, Clock, Send, Sparkles, X, ChevronDown, 
  Info, AlertCircle, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  type: string; // 'Veg' | 'Non-Veg'
  isAvailable: boolean;
  preparationTime: number | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  orderIndex: number;
  items: MenuItem[];
};

export type TableOrder = {
  id: string;
  status: string;
  partyLabel?: string | null;
  guestCount?: number | null;
  groupName?: string | null;
  total: number;
  subtotal: number;
  tax: number;
  items: {
    id: string;
    quantity: number;
    price: number;
    specialInstructions?: string | null;
    menuItem: MenuItem;
  }[];
  customer?: { name: string | null } | null;
};

export type Table = {
  id: string;
  number: string;
  capacity: number;
  location?: string | null;
  status: "AVAILABLE" | "PARTIALLY_OCCUPIED" | "OCCUPIED" | "RESERVED" | "CLEANING" | "OUT_OF_SERVICE";
  orders?: TableOrder[];
};

interface WaiterPosClientProps {
  restaurant: {
    id: string;
    name: string;
    settings?: any;
  };
  initialTables: Table[];
  categories: MenuCategory[];
  activeOrders: any[];
  staffUser: {
    id: string;
    name: string;
    role: string;
  };
}

type CartItem = {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions: string;
};

export function WaiterPosClient({
  restaurant,
  initialTables,
  categories,
  staffUser,
}: WaiterPosClientProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedTableId, setSelectedTableId] = useState<string>(
    initialTables[0]?.id || ""
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialTables[0]?.orders?.[0]?.id || ""
  );

  // Cart state: { [menuItemId]: CartItem }
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  
  // Filter state
  const [selectedCatId, setSelectedCatId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "Veg" | "Non-Veg">("ALL");

  // Instruction Modal state
  const [editingInstructionItem, setEditingInstructionItem] = useState<MenuItem | null>(null);
  const [tempInstruction, setTempInstruction] = useState("");

  // Mobile cart sheet state
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  const activeTableOrder = useMemo(() => {
    if (!selectedTable?.orders || selectedTable.orders.length === 0) return null;
    if (selectedOrderId) {
      return selectedTable.orders.find((o) => o.id === selectedOrderId) || selectedTable.orders[0];
    }
    return selectedTable.orders[0];
  }, [selectedTable, selectedOrderId]);

  const allItems = useMemo(() => {
    return categories.flatMap((c) => c.items);
  }, [categories]);

  // Cart calculations
  const cartEntries = Object.values(cart);
  const cartItemsCount = cartEntries.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cartEntries.reduce(
    (sum, i) => sum + i.menuItem.price * i.quantity,
    0
  );
  const taxRate = (restaurant.settings as any)?.tax || 5;
  const taxAmount = (cartSubtotal * taxRate) / 100;
  const cartTotal = cartSubtotal + taxAmount;

  // Add / Update item in cart
  const handleAddItem = (item: MenuItem, delta = 1) => {
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = (existing?.quantity || 0) + delta;

      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      }

      return {
        ...prev,
        [item.id]: {
          menuItem: item,
          quantity: newQty,
          specialInstructions: existing?.specialInstructions || "",
        },
      };
    });
  };

  const handleOpenInstructionModal = (item: MenuItem) => {
    setEditingInstructionItem(item);
    setTempInstruction(cart[item.id]?.specialInstructions || "");
  };

  const handleSaveInstruction = () => {
    if (!editingInstructionItem) return;
    setCart((prev) => {
      const existing = prev[editingInstructionItem.id];
      if (!existing) {
        return {
          ...prev,
          [editingInstructionItem.id]: {
            menuItem: editingInstructionItem,
            quantity: 1,
            specialInstructions: tempInstruction,
          },
        };
      }
      return {
        ...prev,
        [editingInstructionItem.id]: {
          ...existing,
          specialInstructions: tempInstruction,
        },
      };
    });
    setEditingInstructionItem(null);
    setTempInstruction("");
    toast({ title: "Customization saved" });
  };

  // Dispatch Order to Kitchen
  const handleSendToKitchen = async () => {
    if (cartItemsCount === 0 || !selectedTable) {
      toast({
        variant: "destructive",
        title: "Cart is empty",
        description: "Please select at least one dish to send to kitchen.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        restaurantId: restaurant.id,
        tableId: selectedTable.id,
        orderId: activeTableOrder?.id,
        partyLabel: activeTableOrder?.partyLabel || "A",
        guestCount: activeTableOrder?.guestCount || 1,
        type: "DINE_IN",
        items: cartEntries.map((e) => ({
          menuItemId: e.menuItem.id,
          quantity: e.quantity,
          specialInstructions: e.specialInstructions || undefined,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        // Update local table orders and status
        setTables((prev) =>
          prev.map((t) => {
            if (t.id === selectedTable.id) {
              const existingOrders = t.orders || [];
              const orderIndex = existingOrders.findIndex((o) => o.id === json.data.id);
              let updatedOrders: TableOrder[];
              if (orderIndex >= 0) {
                updatedOrders = existingOrders.map((o) =>
                  o.id === json.data.id ? json.data : o
                );
              } else {
                updatedOrders = [json.data, ...existingOrders];
              }

              const totalOccupiedSeats = updatedOrders.reduce(
                (sum, o) => sum + (o.guestCount || 1),
                0
              );
              const nextStatus =
                totalOccupiedSeats >= t.capacity
                  ? "OCCUPIED"
                  : "PARTIALLY_OCCUPIED";

              return {
                ...t,
                status: nextStatus,
                orders: updatedOrders,
              };
            }
            return t;
          })
        );

        setCart({});
        setIsMobileCartOpen(false);
        toast({
          title: `🔥 KOT Dispatched: Table ${selectedTable.number} [Group ${activeTableOrder?.partyLabel || "A"}]`,
          description: `${cartItemsCount} item(s) sent directly to kitchen display.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: json.error || "Could not dispatch order.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: err.message || "Failed to connect to server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered menu items
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        if (selectedCatId !== "ALL" && cat.id !== selectedCatId) return null;

        const items = cat.items.filter((item) => {
          if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
              item.name.toLowerCase().includes(q) ||
              item.description?.toLowerCase().includes(q)
            );
          }
          return true;
        });

        if (items.length === 0) return null;
        return { ...cat, items };
      })
      .filter(Boolean) as MenuCategory[];
  }, [categories, selectedCatId, typeFilter, searchQuery]);

  return (
    <div className="space-y-3 pb-24 lg:pb-6">
      {/* ─── TOP BAR: TABLE SELECTOR & WAITER PROFILE ─────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Table Selector */}
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-black shrink-0">
              <Armchair className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  Active Table:
                </label>
                {selectedTable && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0 font-bold",
                      selectedTable.status === "AVAILABLE"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : selectedTable.status === "PARTIALLY_OCCUPIED"
                        ? "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                        : "text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300"
                    )}
                  >
                    {selectedTable.status.replace("_", " ")}
                  </Badge>
                )}
              </div>

              <div className="relative mt-0.5">
                <select
                  value={selectedTableId}
                  onChange={(e) => {
                    const nextTId = e.target.value;
                    setSelectedTableId(nextTId);
                    const nextTable = tables.find((t) => t.id === nextTId);
                    setSelectedOrderId(nextTable?.orders?.[0]?.id || "");
                    setCart({});
                  }}
                  className="w-full sm:w-72 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {tables.map((t) => {
                    const ordersCount = t.orders ? t.orders.length : 0;
                    const totalBill = t.orders
                      ? t.orders.reduce((acc, o) => acc + o.total, 0)
                      : 0;
                    return (
                      <option key={t.id} value={t.id}>
                        Table {t.number} ({t.capacity}p) • {t.status.replace("_", " ")}
                        {ordersCount > 1
                          ? ` • Shared (${ordersCount} Groups - Total ₹${totalBill})`
                          : ordersCount === 1
                          ? ` • Live ₹${totalBill}`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Current Party Running Tab Indicator */}
          {activeTableOrder && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-1.5 flex items-center justify-between sm:justify-end gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase block">
                  Group {activeTableOrder.partyLabel || "A"} Bill
                </span>
                <span className="font-black text-rose-950 dark:text-rose-200 font-serif text-sm">
                  ₹{activeTableOrder.total.toFixed(2)}
                </span>
              </div>
              <Badge className="bg-rose-600 text-[10px]">
                {activeTableOrder.items.length} Placed Items
              </Badge>
            </div>
          )}
        </div>

        {/* Sub-Party Tabs for Shared Tables */}
        {selectedTable?.orders && selectedTable.orders.length > 1 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-2 overflow-x-auto">
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 shrink-0">
              Shared Groups on Table {selectedTable.number}:
            </span>
            {selectedTable.orders.map((ord) => {
              const isSelectedParty =
                selectedOrderId === ord.id ||
                (!selectedOrderId && selectedTable.orders![0].id === ord.id);
              return (
                <button
                  key={ord.id}
                  onClick={() => {
                    setSelectedOrderId(ord.id);
                    setCart({});
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shrink-0 border",
                    isSelectedParty
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                  )}
                >
                  <span>Group {ord.partyLabel || "A"} ({ord.customer?.name || `${ord.guestCount || 1}p`})</span>
                  <span className="font-serif text-[11px] opacity-80">₹{ord.total.toFixed(0)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MAIN 2-COLUMN VIEWPORT: MENU + LIVE CART (DESKTOP) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: MENU BROWSER & FILTERS (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Search & Veg/Non-Veg Toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search dishes (e.g. Biryani, Paneer, Shake)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Veg / Non-Veg Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                {(["ALL", "Veg", "Non-Veg"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                      typeFilter === t
                        ? t === "Veg"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : t === "Non-Veg"
                          ? "bg-rose-600 text-white shadow-xs"
                          : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                        : "text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {t === "ALL" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Pills with Horizontal Scroll */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1">
              <button
                onClick={() => setSelectedCatId("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  selectedCatId === "ALL"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                )}
              >
                All Categories ({allItems.length})
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                    selectedCatId === cat.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  )}
                >
                  {cat.name} ({cat.items.length})
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="space-y-4">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="space-y-2">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 px-1">
                  {cat.name} ({cat.items.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {cat.items.map((item) => {
                    const cartItem = cart[item.id];
                    const qty = cartItem?.quantity || 0;
                    const isVeg = item.type === "Veg";

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-2xl border transition-all flex flex-col justify-between select-none relative",
                          qty > 0
                            ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 ring-1 ring-amber-400/50"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                        )}
                      >
                        {/* Top: Name, Price, Veg badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full shrink-0",
                                  isVeg ? "bg-emerald-500" : "bg-rose-500"
                                )}
                              />
                              <span className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                                {item.name}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <span className="font-black text-sm font-serif text-slate-900 dark:text-white shrink-0">
                            ₹{item.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Middle: Notes Badge if custom notes entered */}
                        {cartItem?.specialInstructions && (
                          <div className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/50 px-2 py-0.5 rounded-md italic">
                            Note: "{cartItem.specialInstructions}"
                          </div>
                        )}

                        {/* Bottom: Actions Stepper */}
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <button
                            onClick={() => handleOpenInstructionModal(item)}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            {cartItem?.specialInstructions
                              ? "Edit Note"
                              : "Add Note"}
                          </button>

                          {qty === 0 ? (
                            <Button
                              size="sm"
                              onClick={() => handleAddItem(item, 1)}
                              className="h-7 text-xs px-3 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold rounded-xl"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2 bg-amber-500 text-slate-950 font-black rounded-xl px-2 py-0.5 shadow-2xs">
                              <button
                                onClick={() => handleAddItem(item, -1)}
                                className="p-1 hover:bg-amber-600 rounded-lg active:scale-75 transition-all"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs min-w-[14px] text-center">
                                {qty}
                              </span>
                              <button
                                onClick={() => handleAddItem(item, 1)}
                                className="p-1 hover:bg-amber-600 rounded-lg active:scale-75 transition-all"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No menu items match your filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DESKTOP LIVE KOT CART (4 cols on desktop) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-16">
          <Card className="border-slate-200 dark:border-slate-800 shadow-md rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-100px)]">
            <div className="p-4 bg-slate-900 text-white dark:bg-slate-850 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-black text-sm block">
                    KOT / Table {selectedTable?.number}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedTable?.location || "Indoor"} • Cap {selectedTable?.capacity}p
                  </span>
                </div>
              </div>
              {cartItemsCount > 0 && (
                <button
                  onClick={() => setCart({})}
                  className="text-xs text-rose-300 hover:text-rose-100 flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                </button>
              )}
            </div>

            {/* Existing Placed Items for Table */}
            {activeTableOrder && activeTableOrder.items.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/50">
                <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 block mb-1">
                  Already In Kitchen / Served ({activeTableOrder.items.length} items)
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs">
                  {activeTableOrder.items.map((i, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-emerald-950 dark:text-emerald-200 text-[11px]"
                    >
                      <span>
                        {i.quantity}x {i.menuItem?.name || "Dish"}
                      </span>
                      <span className="font-semibold">
                        ₹{(i.price * i.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
              {cartItemsCount === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No new items selected
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tap any dish from the menu to add to this KOT.
                  </p>
                </div>
              ) : (
                cartEntries.map((entry) => (
                  <div
                    key={entry.menuItem.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {entry.menuItem.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-serif">
                          ₹{entry.menuItem.price} × {entry.quantity} = ₹
                          {(entry.menuItem.price * entry.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                        <button
                          onClick={() => handleAddItem(entry.menuItem, -1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Minus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                        </button>
                        <span className="font-black text-xs min-w-[14px] text-center">
                          {entry.quantity}
                        </span>
                        <button
                          onClick={() => handleAddItem(entry.menuItem, 1)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Plus className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                        </button>
                      </div>
                    </div>

                    {entry.specialInstructions && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300 italic bg-amber-50 dark:bg-amber-950/40 p-1 rounded">
                        Note: {entry.specialInstructions}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>

            {/* Bill Summary & Send Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>New Subtotal ({cartItemsCount} items)</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Tax ({taxRate}%)</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>New KOT Total</span>
                  <span className="font-serif">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleSendToKitchen}
                isLoading={isSubmitting}
                loadingText={`Dispatching KOT... (₹${cartTotal.toFixed(0)})`}
                disabled={cartItemsCount === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl text-sm shadow-md flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send KOT to Kitchen (₹{cartTotal.toFixed(0)})</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── MOBILE FLOATING CART BAR (SCREENS < LG) ──────────────── */}
      {cartItemsCount > 0 && (
        <div className="lg:hidden fixed bottom-4 left-3 right-3 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-950 text-white rounded-2xl p-3 px-4 shadow-2xl border border-slate-700 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-md">
                  {cartItemsCount} Items
                </span>
                <span className="text-xs font-bold">Table {selectedTable?.number}</span>
              </div>
              <span className="font-black text-base font-serif text-amber-400 block mt-0.5">
                ₹{cartTotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsMobileCartOpen(true)}
                variant="outline"
                size="sm"
                className="h-9 rounded-xl border-slate-700 text-slate-200 text-xs font-bold"
              >
                View
              </Button>
              <Button
                onClick={handleSendToKitchen}
                disabled={isSubmitting}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-9 px-3.5 rounded-xl text-xs flex items-center"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Send KOT
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MOBILE CART MODAL ────────────────────────────────────── */}
      <Dialog open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl lg:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>KOT Review — Table {selectedTable?.number}</span>
              <Badge className="bg-emerald-600 text-xs">{cartItemsCount} Items</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {cartEntries.map((entry) => (
              <div
                key={entry.menuItem.id}
                className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      {entry.menuItem.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-serif">
                      ₹{entry.menuItem.price} × {entry.quantity} = ₹
                      {(entry.menuItem.price * entry.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                    <button
                      onClick={() => handleAddItem(entry.menuItem, -1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs min-w-[14px] text-center">
                      {entry.quantity}
                    </span>
                    <button
                      onClick={() => handleAddItem(entry.menuItem, 1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {entry.specialInstructions && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-300 italic bg-amber-100/60 dark:bg-amber-900/40 p-1 rounded">
                    Note: {entry.specialInstructions}
                  </p>
                )}
              </div>
            ))}

            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Estimated Tax ({taxRate}%)</span>
                <span>₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMobileCartOpen(false)}
              className="rounded-xl"
            >
              Add More Dishes
            </Button>
            <Button
              onClick={handleSendToKitchen}
              isLoading={isSubmitting}
              loadingText="Dispatching..."
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
            >
              Confirm & Send KOT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── CUSTOMIZATION / INSTRUCTION MODAL ────────────────────── */}
      <Dialog
        open={!!editingInstructionItem}
        onOpenChange={(open) => !open && setEditingInstructionItem(null)}
      >
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              Cooking Instructions: {editingInstructionItem?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Kitchen Modifiers & Dietary Notes:
            </label>
            <Input
              placeholder="e.g. Less spicy, extra cheese, no coriander..."
              value={tempInstruction}
              onChange={(e) => setTempInstruction(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Less Spicy",
                "Extra Spicy",
                "No Onion",
                "No Garlic",
                "Extra Cheese",
                "Well Done",
                "Serve Hot",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() =>
                    setTempInstruction((prev) =>
                      prev ? `${prev}, ${sug}` : sug
                    )
                  }
                  className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingInstructionItem(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveInstruction}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
            >
              Save Customization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
