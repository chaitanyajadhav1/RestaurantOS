"use client";

import React, { useState, useMemo } from "react";
import { 
  Zap, Search, Plus, Minus, ShoppingBag, 
  ChefHat, Send, Sparkles, X, ChevronDown, 
  ChevronUp, Armchair, Clock, Edit3, ArrowRight,
  CheckCircle2, AlertCircle, Utensils, PlusCircle, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  type: string; // 'Veg' | 'Non-Veg'
  isAvailable: boolean;
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

interface WaiterAddonsClientProps {
  restaurant: {
    id: string;
    name: string;
    settings?: any;
  };
  tables: Table[];
  categories: MenuCategory[];
  initialTableId?: string;
  staffUser: {
    id: string;
    name: string;
    role: string;
  };
}

type AddonItem = {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions: string;
};

export function WaiterAddonsClient({
  restaurant,
  tables: initialTables,
  categories: initialCategories,
  initialTableId,
  staffUser,
}: WaiterAddonsClientProps) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);

  // Filter occupied tables first, or fallback to all tables
  const occupiedTables = useMemo(() => {
    return tables.filter(
      (t) => t.status === "OCCUPIED" || t.status === "PARTIALLY_OCCUPIED" || (t.orders && t.orders.length > 0)
    );
  }, [tables]);

  const [selectedTableId, setSelectedTableId] = useState<string>(() => {
    if (initialTableId && tables.some((t) => t.id === initialTableId)) {
      return initialTableId;
    }
    return occupiedTables[0]?.id || tables[0]?.id || "";
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const table = tables.find(t => t.id === (initialTableId || occupiedTables[0]?.id || tables[0]?.id));
    return table?.orders?.[0]?.id || "";
  });

  const [showAllTables, setShowAllTables] = useState(false);
  const [showExistingItems, setShowExistingItems] = useState(true);

  // Add-on Cart: { [menuItemId]: AddonItem }
  const [addonsCart, setAddonsCart] = useState<Record<string, AddonItem>>({});

  // Filter state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("POPULAR");
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  // Note Modal
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [tempNote, setTempNote] = useState("");

  // Create New Menu Item Modal
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>(initialCategories[0]?.id || "");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemType, setNewItemType] = useState<"Veg" | "Non-Veg">("Veg");
  const [newItemPrepTime, setNewItemPrepTime] = useState("10");
  const [alsoAddToCurrentTable, setAlsoAddToCurrentTable] = useState(true);
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  const activeOrder = useMemo(() => {
    if (!selectedTable?.orders || selectedTable.orders.length === 0) return null;
    if (selectedOrderId) {
      return selectedTable.orders.find((o) => o.id === selectedOrderId) || selectedTable.orders[0];
    }
    return selectedTable.orders[0];
  }, [selectedTable, selectedOrderId]);

  const allItems = useMemo(() => {
    return categories.flatMap((c) => c.items);
  }, [categories]);

  // Identify high-frequency add-on categories (Breads, Drinks, Desserts, Sides, Extras)
  const popularAddonItems = useMemo(() => {
    return allItems.filter((item) => {
      const name = item.name.toLowerCase();
      return (
        name.includes("roti") ||
        name.includes("naan") ||
        name.includes("bread") ||
        name.includes("kulcha") ||
        name.includes("paratha") ||
        name.includes("coke") ||
        name.includes("water") ||
        name.includes("soda") ||
        name.includes("beverage") ||
        name.includes("juice") ||
        name.includes("ice cream") ||
        name.includes("dessert") ||
        name.includes("gulab") ||
        name.includes("papad") ||
        name.includes("salad") ||
        name.includes("raita") ||
        name.includes("extra") ||
        name.includes("dip")
      );
    });
  }, [allItems]);

  // Add-on Cart calculations
  const addonEntries = Object.values(addonsCart);
  const addonItemsCount = addonEntries.reduce((sum, i) => sum + i.quantity, 0);
  const addonSubtotal = addonEntries.reduce(
    (sum, i) => sum + i.menuItem.price * i.quantity,
    0
  );
  const taxRate = (restaurant.settings as any)?.tax || 5;
  const addonTax = (addonSubtotal * taxRate) / 100;
  const addonTotal = addonSubtotal + addonTax;

  const newEstimatedTableTotal = (activeOrder?.total || 0) + addonTotal;

  // Add / Step quantity
  const handleUpdateQty = (item: MenuItem, delta: number) => {
    setAddonsCart((prev) => {
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

  const handleOpenNoteModal = (item: MenuItem) => {
    setEditingItem(item);
    setTempNote(addonsCart[item.id]?.specialInstructions || "");
  };

  const handleSaveNote = () => {
    if (!editingItem) return;
    setAddonsCart((prev) => {
      const existing = prev[editingItem.id];
      if (!existing) {
        return {
          ...prev,
          [editingItem.id]: {
            menuItem: editingItem,
            quantity: 1,
            specialInstructions: tempNote,
          },
        };
      }
      return {
        ...prev,
        [editingItem.id]: {
          ...existing,
          specialInstructions: tempNote,
        },
      };
    });
    setEditingItem(null);
    setTempNote("");
    toast({ title: "Custom note saved" });
  };

  // Create new menu item on the fly
  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice || !newItemCategoryId) {
      toast({ variant: "destructive", title: "Please fill in item name, price, and category" });
      return;
    }

    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ variant: "destructive", title: "Please enter a valid price" });
      return;
    }

    setIsCreatingItem(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName.trim(),
          price: priceNum,
          type: newItemType,
          categoryId: newItemCategoryId,
          preparationTime: parseInt(newItemPrepTime) || 10,
          isAvailable: true,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const created: MenuItem = {
          id: json.data.id,
          categoryId: json.data.categoryId,
          name: json.data.name,
          description: json.data.description || null,
          price: json.data.price,
          type: json.data.type,
          isAvailable: json.data.isAvailable,
        };

        // Append to local categories state
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id === created.categoryId) {
              return {
                ...cat,
                items: [created, ...cat.items],
              };
            }
            return cat;
          })
        );

        // Also add directly to current table's Add-on cart if selected
        if (alsoAddToCurrentTable) {
          handleUpdateQty(created, 1);
        }

        toast({
          title: `✨ "${created.name}" added to menu!`,
          description: alsoAddToCurrentTable
            ? `Added directly to Table ${selectedTable?.number || ""} KOT.`
            : "Available immediately in menu list.",
        });

        // Reset
        setNewItemName("");
        setNewItemPrice("");
        setIsNewItemModalOpen(false);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to create item",
          description: json.error || "Please check fields",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: err.message,
      });
    } finally {
      setIsCreatingItem(false);
    }
  };

  // Dispatch Add-On KOT to Kitchen
  const handleSendAddonKot = async () => {
    if (addonItemsCount === 0 || !selectedTable) {
      toast({
        variant: "destructive",
        title: "No Add-On items selected",
        description: "Please select at least one item to add to the table.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        restaurantId: restaurant.id,
        tableId: selectedTable.id,
        orderId: activeOrder?.id,
        partyLabel: activeOrder?.partyLabel || "A",
        guestCount: activeOrder?.guestCount || 1,
        type: "DINE_IN",
        items: addonEntries.map((e) => ({
          menuItemId: e.menuItem.id,
          quantity: e.quantity,
          specialInstructions: e.specialInstructions
            ? `⚡ ADD-ON: ${e.specialInstructions}`
            : `⚡ ADD-ON`,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        // Update local table data preserving other groups
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

        setAddonsCart({});
        toast({
          title: `⚡ Add-On KOT Dispatched for Table ${selectedTable.number} [Group ${activeOrder?.partyLabel || "A"}]`,
          description: `${addonItemsCount} item(s) sent straight to kitchen.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to dispatch Add-On",
          description: json.error || "Could not update table order.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Network Error",
        description: err.message || "Failed to contact server.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered items to display
  const itemsToDisplay = useMemo(() => {
    let list: MenuItem[] = [];

    if (selectedCategoryTab === "POPULAR") {
      list = popularAddonItems.length > 0 ? popularAddonItems : allItems;
    } else if (selectedCategoryTab === "ALL") {
      list = allItems;
    } else {
      const cat = categories.find((c) => c.id === selectedCategoryTab);
      list = cat ? cat.items : [];
    }

    return list.filter((item) => {
      if (vegOnly && item.type !== "Veg") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    selectedCategoryTab,
    popularAddonItems,
    allItems,
    categories,
    vegOnly,
    searchQuery,
  ]);

  const displayedTables = showAllTables ? tables : occupiedTables;

  return (
    <div className="space-y-4 pb-28">
      {/* ─── 1. HEADER TITLE & QUICK ACTIONS ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black">
              <Zap className="w-5 h-5 fill-current" />
            </span>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                Quick Table Add-Ons
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly append extra rotis, drinks, and side dishes to active dining tables.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Button: Add New Item to Menu */}
          <Button
            onClick={() => setIsNewItemModalOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs flex items-center"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> + New Menu Item
          </Button>

          <Link href="/staff/pos">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 rounded-xl font-bold border-slate-200 dark:border-slate-700"
            >
              <Utensils className="w-3.5 h-3.5 mr-1 text-slate-500" /> Full POS
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── 2. ACTIVE OCCUPIED TABLES SELECTOR STRIP ─────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Armchair className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Select Dining Table:
            </span>
            <Badge className="bg-rose-500 text-[10px] font-black px-1.5 py-0">
              {occupiedTables.length} Active Tables
            </Badge>
          </div>

          <button
            onClick={() => setShowAllTables(!showAllTables)}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showAllTables ? "Show Occupied Only" : "Show All Tables"}
          </button>
        </div>

        {displayedTables.length === 0 ? (
          <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Armchair className="w-8 h-8 mx-auto mb-1 opacity-40 text-slate-400" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No active tables occupied right now.
            </p>
            <p className="text-[10px] text-slate-400">
              Select "Show All Tables" or seat a party from Queue / Floor view.
            </p>
          </div>
        ) : (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {displayedTables.map((t) => {
              const isSelected = t.id === selectedTableId;
              const ordersCount = t.orders ? t.orders.length : 0;
              const hasOrder = ordersCount > 0;
              const currentTotal = hasOrder
                ? t.orders!.reduce((acc, o) => acc + o.total, 0)
                : 0;
              const totalItemsCount = hasOrder
                ? t.orders!.reduce((acc, o) => acc + o.items.length, 0)
                : 0;

              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTableId(t.id);
                    setSelectedOrderId(t.orders?.[0]?.id || "");
                    setAddonsCart({});
                  }}
                  className={cn(
                    "p-2.5 px-3.5 rounded-2xl border text-left shrink-0 transition-all min-w-[130px]",
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-white shadow-md scale-102"
                      : "bg-slate-50 dark:bg-slate-850/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-800 dark:text-slate-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">Table {t.number}</span>
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        t.status === "OCCUPIED"
                          ? "bg-rose-500"
                          : t.status === "PARTIALLY_OCCUPIED"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-emerald-500"
                      )}
                    />
                  </div>

                  <div className="mt-1 text-[11px] font-bold font-serif opacity-90">
                    {hasOrder ? `₹${currentTotal.toFixed(0)}` : "Empty Table"}
                  </div>

                  <div className="text-[10px] opacity-70">
                    {ordersCount > 1
                      ? `${ordersCount} Groups • Shared`
                      : hasOrder
                      ? `${totalItemsCount} items placed`
                      : `Cap ${t.capacity}p`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 3. CURRENT TABLE RUNNING SUMMARY & DIRECT REPEAT ──────── */}
      {selectedTable && (
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm text-amber-950 dark:text-amber-200">
                Table {selectedTable.number} {activeOrder?.partyLabel ? `[Group ${activeOrder.partyLabel}]` : ""} Tab
              </span>
              {activeOrder && (
                <Badge variant="outline" className="text-[10px] bg-white/80 dark:bg-slate-900/80 text-amber-900 dark:text-amber-300 font-serif font-black">
                  Current Bill: ₹{activeOrder.total.toFixed(2)}
                </Badge>
              )}
            </div>

            {activeOrder && activeOrder.items.length > 0 && (
              <button
                onClick={() => setShowExistingItems(!showExistingItems)}
                className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center hover:underline"
              >
                <span>{showExistingItems ? "Hide Placed Dishes" : `View Placed (${activeOrder.items.length})`}</span>
                {showExistingItems ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
              </button>
            )}
          </div>

          {/* Sub-Party Selector for Shared Tables */}
          {selectedTable.orders && selectedTable.orders.length > 1 && (
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/50 flex items-center space-x-1.5 overflow-x-auto pb-0.5">
              <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 shrink-0">
                Select Group Tab:
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
                      setAddonsCart({});
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shrink-0 border",
                      isSelectedParty
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/50"
                    )}
                  >
                    <span>Group {ord.partyLabel || "A"} ({ord.customer?.name || `${ord.guestCount || 1}p`})</span>
                    <span className="font-serif text-[11px] opacity-85">₹{ord.total.toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Placed Items with 1-Tap Repeat Buttons */}
          {showExistingItems && activeOrder && (
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/50 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 dark:text-amber-300/80 block">
                Dishes Already Placed for Group {activeOrder.partyLabel || "A"} (Tap "+ 1 More" to repeat):
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {activeOrder.items.map((i, idx) => {
                  const cartQty = addonsCart[i.menuItem.id]?.quantity || 0;
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-900/50 flex justify-between items-center shadow-2xs"
                    >
                      <div className="flex-1 pr-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white block leading-tight">
                          {i.quantity}x {i.menuItem?.name}
                        </span>
                        <span className="text-[10px] font-serif text-slate-500">
                          ₹{i.price.toFixed(0)} each
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {cartQty > 0 && (
                          <Badge className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0">
                            +{cartQty}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleUpdateQty(i.menuItem, 1)}
                          className="h-7 text-xs px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg shadow-2xs active:scale-95 transition-all"
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> 1 More
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 4. SEARCH & CATEGORY FILTER CHIPS ────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Quick search add-ons (e.g. Naan, Roti, Soda, Ice cream)..."
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

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={cn(
                "px-3 h-10 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center space-x-1.5",
                vegOnly
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Veg Only</span>
            </button>

            {/* Quick Add New Item shortcut */}
            <Button
              onClick={() => setIsNewItemModalOpen(true)}
              variant="outline"
              size="sm"
              className="h-10 rounded-xl text-xs font-bold border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Custom Item
            </Button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setSelectedCategoryTab("POPULAR")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center space-x-1",
              selectedCategoryTab === "POPULAR"
                ? "bg-amber-500 text-slate-950 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>⚡ Popular Add-Ons ({popularAddonItems.length})</span>
          </button>

          <button
            onClick={() => setSelectedCategoryTab("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              selectedCategoryTab === "ALL"
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            )}
          >
            All Menu ({allItems.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryTab(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                selectedCategoryTab === cat.id
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              {cat.name} ({cat.items.length})
            </button>
          ))}
        </div>
      </div>

      {/* ─── 5. RAPID 1-TAP ADD-ON DISHES GRID ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {itemsToDisplay.map((item) => {
          const cartItem = addonsCart[item.id];
          const qty = cartItem?.quantity || 0;
          const isVeg = item.type === "Veg";

          return (
            <div
              key={item.id}
              className={cn(
                "p-3 rounded-2xl border transition-all flex flex-col justify-between select-none relative",
                qty > 0
                  ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-800 ring-2 ring-amber-400/40"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              )}
            >
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
                  <span className="font-black text-xs font-serif text-slate-600 dark:text-slate-300 block mt-0.5">
                    ₹{item.price.toFixed(2)}
                  </span>
                </div>

                {/* Quick Add Button or Stepper */}
                {qty === 0 ? (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateQty(item, 1)}
                    className="h-8 px-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-black rounded-xl text-xs shadow-2xs active:scale-90 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                ) : (
                  <div className="flex items-center space-x-1.5 bg-amber-500 text-slate-950 font-black rounded-xl p-1 shadow-xs">
                    <button
                      onClick={() => handleUpdateQty(item, -1)}
                      className="p-1 hover:bg-amber-600 rounded-lg active:scale-75 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs min-w-[18px] text-center font-black">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleUpdateQty(item, 1)}
                      className="p-1 hover:bg-amber-600 rounded-lg active:scale-75 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Note if added */}
              {cartItem?.specialInstructions && (
                <div className="mt-2 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/40 p-1 px-2 rounded-lg italic">
                  Note: "{cartItem.specialInstructions}"
                </div>
              )}

              {/* Note toggle */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                <button
                  onClick={() => handleOpenNoteModal(item)}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  {cartItem?.specialInstructions ? "Edit Note" : "+ Note"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {itemsToDisplay.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
          <Zap className="w-8 h-8 mx-auto mb-1 opacity-30 text-amber-500" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            No add-on dishes match your search.
          </p>
          <Button
            onClick={() => setIsNewItemModalOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add "{searchQuery}" as New Item
          </Button>
        </div>
      )}

      {/* ─── 6. STICKY BOTTOM ADD-ON KOT DISPATCH BAR ─────────────── */}
      {addonItemsCount > 0 && selectedTable && (
        <div className="fixed bottom-3 left-3 right-3 max-w-4xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-950 text-white rounded-3xl p-3.5 px-5 shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-lg">
                  {addonItemsCount} Add-On {addonItemsCount === 1 ? "Item" : "Items"}
                </span>
                <span className="font-bold text-sm">Table {selectedTable.number}</span>
              </div>
              
              <div className="flex items-center space-x-3 text-xs mt-1 text-slate-300">
                <span>Add-on: <strong className="text-amber-400 font-serif font-black">₹{addonTotal.toFixed(2)}</strong></span>
                <span>•</span>
                <span>New Table Total: <strong className="text-white font-serif font-black">₹{newEstimatedTableTotal.toFixed(2)}</strong></span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddonsCart({})}
                className="h-11 rounded-2xl border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                Clear
              </Button>
              <Button
                onClick={handleSendAddonKot}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-black h-11 px-5 rounded-2xl text-xs sm:text-sm shadow-md flex items-center justify-center space-x-1.5"
              >
                <Send className="w-4 h-4 mr-1" />
                <span>
                  {isSubmitting
                    ? "Dispatching..."
                    : `🔥 Send Add-On KOT (₹${addonTotal.toFixed(0)})`}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. MODAL: CREATE NEW ITEM TO MENU ────────────────────── */}
      <Dialog
        open={isNewItemModalOpen}
        onOpenChange={setIsNewItemModalOpen}
      >
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center">
              <PlusCircle className="w-4 h-4 mr-1.5 text-indigo-600" />
              Add New Dish to Menu
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quickly add a new item or off-menu special to the menu list.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewItem} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Dish Name *</Label>
              <Input
                placeholder="e.g. Garlic Butter Naan, Crispy Corn, Extra Dip"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Price (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 150"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Dietary Type *</Label>
                <Select
                  value={newItemType}
                  onValueChange={(val) => val && setNewItemType(val as "Veg" | "Non-Veg")}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veg">🟢 Veg</SelectItem>
                    <SelectItem value="Non-Veg">🔴 Non-Veg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Category *</Label>
              <Select
                value={newItemCategoryId}
                onValueChange={(val) => val && setNewItemCategoryId(val)}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 cursor-pointer">
                Also add immediately to Table {selectedTable?.number} KOT?
              </label>
              <input
                type="checkbox"
                checked={alsoAddToCurrentTable}
                onChange={(e) => setAlsoAddToCurrentTable(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewItemModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingItem}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
              >
                {isCreatingItem ? "Creating..." : "Save & Add to Menu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── 8. SPECIAL INSTRUCTION / NOTE MODAL ──────────────────── */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              Add-On Note: {editingItem?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Cooking / Preparation Note:
            </label>
            <Input
              placeholder="e.g. Extra butter, make it crisp, serve hot, without ice..."
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Extra Butter",
                "Make it Crisp",
                "Serve Hot",
                "Without Ice",
                "Extra Spicy",
                "Less Spicy",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() =>
                    setTempNote((prev) => (prev ? `${prev}, ${sug}` : sug))
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
              onClick={() => setEditingItem(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
