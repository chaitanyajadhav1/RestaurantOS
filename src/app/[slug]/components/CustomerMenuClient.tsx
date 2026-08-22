"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, Minus, ShoppingBag, Utensils, CheckCircle2, 
  Search, X, Loader2, ArrowRight, Clock, Sparkles, AlertCircle
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

export type ActiveTableData = {
  tableId: string;
  tableNumber: string;
  orderStatus: string;
  orderId: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
};

interface CustomerMenuClientProps {
  categories: MenuCategory[];
  restaurantId: string;
  restaurantSlug: string;
  currency: string;
  customerName: string;
}

export function CustomerMenuClient({
  categories,
  restaurantId,
  restaurantSlug,
  currency = "₹",
  customerName
}: CustomerMenuClientProps) {
  // Cart state: { [menuItemId]: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string>("ALL");
  const [vegOnly, setVegOnly] = useState(false);

  // Live Seated Table Status
  const [tableData, setTableData] = useState<ActiveTableData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Fetch live table status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/customer/status");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.state === "SEATED" && json.data?.table) {
          setTableData(json.data.table);
        } else {
          setTableData(null);
        }
      }
    } catch (err) {
      console.error("Status fetch error:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Cart operations
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Find all items flat map
  const allItems = categories.flatMap(c => c.items);
  const getItem = (id: string) => allItems.find(i => i.id === id);

  // Calculate Cart Totals
  const cartItemEntries = Object.entries(cart).map(([id, qty]) => ({
    item: getItem(id)!,
    quantity: qty
  })).filter(entry => entry.item);

  const cartItemsCount = cartItemEntries.reduce((sum, e) => sum + e.quantity, 0);
  const cartSubtotal = cartItemEntries.reduce((sum, e) => sum + (e.item.price * e.quantity), 0);
  const taxAmount = Math.round((cartSubtotal * 0.05) * 100) / 100;
  const cartTotal = cartSubtotal + taxAmount;

  // Handle Place Order
  const handlePlaceOrder = async () => {
    if (cartItemsCount === 0) return;
    setIsOrdering(true);

    try {
      const payload = {
        restaurantId,
        tableId: tableData?.tableId,
        type: "DINE_IN",
        items: cartItemEntries.map(e => ({
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
        toast.success("🚀 Order sent to kitchen!");
        setCart({});
        setSpecialInstructions("");
        setIsCartOpen(false);
        setOrderSuccessModal(true);
        fetchStatus();
      } else {
        toast.error(json.error || "Failed to place order");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while placing order");
    } finally {
      setIsOrdering(false);
    }
  };

  // Filter Categories & Items
  const filteredCategories = categories.map(cat => {
    if (selectedCatId !== "ALL" && cat.id !== selectedCatId) {
      return null;
    }

    const matchingItems = cat.items.filter(item => {
      if (vegOnly && item.type !== "Veg") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        return matchesName || matchesDesc;
      }
      return true;
    });

    if (matchingItems.length === 0) return null;

    return {
      ...cat,
      items: matchingItems
    };
  }).filter(Boolean) as MenuCategory[];

  return (
    <div className="space-y-6 pb-28">
      
      {/* SEATED STATUS CALLOUT WITH TABLE DETAILS */}
      {tableData && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl">
              {tableData.tableNumber}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base">You are at Table {tableData.tableNumber}</span>
                <span className="bg-emerald-400/30 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Dine-In
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Add dishes below to send directly to your table's kitchen tab.
              </p>
            </div>
          </div>

          {tableData.items && tableData.items.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-right">
              <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Placed Orders</span>
              <span className="font-extrabold text-sm">{currency}{tableData.total} ({tableData.items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            </div>
          )}
        </div>
      )}

      {/* SEARCH AND FILTER BAR */}
      <div className="sticky top-2 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl p-3 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-2.5">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search food, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-3 h-9 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
              vegOnly 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${vegOnly ? "bg-white" : "bg-emerald-500"}`} />
            <span>Veg Only</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setSelectedCatId("ALL")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
              selectedCatId === "ALL"
                ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all shrink-0 ${
                selectedCatId === cat.id
                  ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* MENU CATEGORY SECTIONS & DISH CARDS */}
      <div className="space-y-10">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900/40 rounded-3xl border border-stone-200 dark:border-zinc-800 text-stone-400">
            <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">No matching dishes found</p>
            <p className="text-xs mt-1">Try clearing your search or filter</p>
          </div>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-serif font-bold text-amber-600 dark:text-amber-400 tracking-wide">
                  {category.name}
                </h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-amber-500/30 to-transparent" />
                <span className="text-xs text-stone-400 font-medium">{category.items.length} items</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {category.items.map((item) => {
                  const qtyInCart = cart[item.id] || 0;

                  return (
                    <div
                      key={item.id}
                      className={`group relative bg-white dark:bg-zinc-900/60 border rounded-2xl p-4 transition-all duration-200 shadow-xs flex flex-col justify-between ${
                        qtyInCart > 0 
                          ? "border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-400/30"
                          : "border-stone-200 dark:border-zinc-800 hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === "Veg" ? (
                              <span className="w-3.5 h-3.5 border-2 border-emerald-600 flex items-center justify-center p-[1.5px] rounded-xs shrink-0">
                                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                              </span>
                            ) : (
                              <span className="w-3.5 h-3.5 border-2 border-rose-600 flex items-center justify-center p-[1.5px] rounded-xs shrink-0">
                                <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                              </span>
                            )}
                            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                              {item.name}
                            </h3>
                          </div>

                          {item.description && (
                            <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="font-bold font-serif text-amber-600 dark:text-amber-400 text-base shrink-0">
                          {currency}{item.price}
                        </div>
                      </div>

                      {/* Card Footer: Add to Cart / Quantity Controller */}
                      <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400 font-medium">
                          {item.type}
                        </span>

                        {qtyInCart === 0 ? (
                          <Button
                            onClick={() => updateQuantity(item.id, 1)}
                            size="sm"
                            className="h-8 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-transform"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> ADD
                          </Button>
                        ) : (
                          <div className="flex items-center space-x-2 bg-amber-500 text-zinc-950 rounded-xl px-2 py-1 shadow-xs">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 hover:bg-amber-600 rounded-lg transition-colors active:scale-90"
                            >
                              <Minus className="w-3.5 h-3.5 font-bold" />
                            </button>
                            <span className="font-black text-sm px-2 min-w-[20px] text-center">
                              {qtyInCart}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 hover:bg-amber-600 rounded-lg transition-colors active:scale-90"
                            >
                              <Plus className="w-3.5 h-3.5 font-bold" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* FLOATING BOTTOM CART BAR */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 text-white rounded-2xl p-3.5 px-5 shadow-2xl border border-zinc-700 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="font-black text-sm">{cartItemsCount} {cartItemsCount === 1 ? "Item" : "Items"}</span>
                {tableData && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    Table {tableData.tableNumber}
                  </span>
                )}
              </div>
              <p className="text-amber-400 font-serif font-bold text-base mt-0.5">
                {currency}{cartTotal} <span className="text-[10px] text-zinc-400 font-sans font-normal">(incl. tax)</span>
              </p>
            </div>

            <Button
              onClick={() => setIsCartOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm px-5 h-10 rounded-xl shadow-md active:scale-95 transition-all flex items-center"
            >
              <span>View Order</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* CART & CHECKOUT REVIEW DRAWER / MODAL */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-lg">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <span>Review Your Table Order</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {tableData ? (
                <span>Ordering directly for <strong>Table {tableData.tableNumber}</strong></span>
              ) : (
                <span>Dine-In Order for <strong>{customerName}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Cart Item Rows */}
          <div className="py-3 space-y-3 max-h-72 overflow-y-auto">
            {cartItemEntries.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-zinc-800/60 rounded-xl border border-stone-200 dark:border-zinc-700">
                <div className="flex-1 pr-2">
                  <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-amber-600 font-serif">{currency}{item.price} each</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 bg-white dark:bg-zinc-900 border rounded-lg px-2 py-0.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-stone-600 hover:text-black">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs px-1">{quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-stone-600 hover:text-black">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold font-serif text-sm min-w-[50px] text-right">
                    {currency}{item.price * quantity}
                  </span>
                </div>
              </div>
            ))}

            {/* Special Instructions Note */}
            <div className="pt-2">
              <Label htmlFor="specialInstructions" className="text-xs font-semibold">Special Instructions (Optional):</Label>
              <Input
                id="specialInstructions"
                placeholder="e.g. Less spicy, serve extra napkins"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="mt-1 h-8 text-xs rounded-xl"
              />
            </div>

            {/* Bill Breakdown */}
            <div className="pt-3 border-t border-stone-200 dark:border-zinc-700 text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>{currency}{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>GST / Tax (5%)</span>
                <span>{currency}{taxAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-white pt-1 border-t">
                <span>Total Amount</span>
                <span className="text-amber-600 font-serif text-base">{currency}{cartTotal}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCartOpen(false)}>Add More Dishes</Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={isOrdering || cartItemsCount === 0}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
            >
              {isOrdering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Sending to Kitchen...
                </>
              ) : (
                <>
                  <span>Send Order to Kitchen</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ORDER SUCCESS POPUP */}
      <Dialog open={orderSuccessModal} onOpenChange={setOrderSuccessModal}>
        <DialogContent className="sm:max-w-md text-center py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <DialogTitle className="text-xl font-bold">Order Received!</DialogTitle>
          <DialogDescription className="text-sm mt-1">
            Your order has been sent directly to the kitchen chef. Delicious food is being prepared for you!
          </DialogDescription>
          <div className="mt-4">
            <Button onClick={() => setOrderSuccessModal(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
              Done / Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
