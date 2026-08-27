"use client";

import { useState, useMemo } from "react";
import {
  UtensilsCrossed,
  Layers,
  PlusCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Leaf,
  Flame,
  X,
  SlidersHorizontal,
  Check,
  ChevronRight,
  Info,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Category = {
  id: string;
  name: string;
  orderIndex: number;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string; // "Veg", "Non-Veg", etc.
  isAvailable: boolean;
  preparationTime: number | null;
  categoryId: string;
  image?: string | null;
  category?: Category;
};

export function AdminMenuClient({
  initialCategories,
  initialMenuItems,
  currency = "₹",
}: {
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
  currency?: string;
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  // Tab State
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");

  // Filtering & Search for Menu Items
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState<string>("ALL");
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);

  // Modal States
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Form States - Item
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemType, setItemType] = useState("Veg");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemPrepTime, setItemPrepTime] = useState("");
  const [itemImage, setItemImage] = useState("");

  // Form States - Category
  const [categoryName, setCategoryName] = useState("");
  const [categoryOrderIndex, setCategoryOrderIndex] = useState("0");

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const totalItems = menuItems.length;
    const vegCount = menuItems.filter((i) => i.type?.toLowerCase() === "veg").length;
    const nonVegCount = menuItems.filter((i) => i.type?.toLowerCase() !== "veg").length;
    const availableCount = menuItems.filter((i) => i.isAvailable).length;
    const unavailableCount = totalItems - availableCount;
    return { totalItems, vegCount, nonVegCount, availableCount, unavailableCount, totalCategories: categories.length };
  }, [menuItems, categories]);

  // Category item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((item) => {
      counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
    });
    return counts;
  }, [menuItems]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        const matchesCat = item.category?.name ? item.category.name.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      // Category filter
      if (selectedCategoryFilter !== "ALL" && item.categoryId !== selectedCategoryFilter) {
        return false;
      }
      // Type filter
      if (selectedTypeFilter !== "ALL" && item.type.toLowerCase() !== selectedTypeFilter.toLowerCase()) {
        return false;
      }
      // Availability filter
      if (selectedAvailabilityFilter === "AVAILABLE" && !item.isAvailable) return false;
      if (selectedAvailabilityFilter === "UNAVAILABLE" && item.isAvailable) return false;

      return true;
    });
  }, [menuItems, searchQuery, selectedCategoryFilter, selectedTypeFilter, selectedAvailabilityFilter]);

  const activeFiltersCount =
    (selectedCategoryFilter !== "ALL" ? 1 : 0) +
    (selectedTypeFilter !== "ALL" ? 1 : 0) +
    (selectedAvailabilityFilter !== "ALL" ? 1 : 0);

  // ----------------------------------------------------
  // ITEM ACTIONS
  // ----------------------------------------------------
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemType("Veg");
    setItemCategoryId(categories[0]?.id || "");
    setItemIsAvailable(true);
    setItemPrepTime("15");
    setItemImage("");
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemDescription(item.description || "");
    setItemPrice(item.price.toString());
    setItemType(item.type || "Veg");
    setItemCategoryId(item.categoryId);
    setItemIsAvailable(item.isAvailable);
    setItemPrepTime(item.preparationTime ? item.preparationTime.toString() : "");
    setItemImage(item.image || "");
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    const priceNum = parseFloat(itemPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }
    if (!itemCategoryId) {
      toast.error("Please select a category");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // UPDATE ITEM
        const res = await fetch(`/api/menu/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemName.trim(),
            description: itemDescription.trim() || null,
            price: priceNum,
            type: itemType,
            categoryId: itemCategoryId,
            isAvailable: itemIsAvailable,
            preparationTime: itemPrepTime ? parseInt(itemPrepTime) : null,
            image: itemImage.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update item");
        }

        const categoryObj = categories.find((c) => c.id === itemCategoryId);
        const updatedObj: MenuItem = {
          ...data.data,
          category: categoryObj,
        };

        setMenuItems((prev) => prev.map((item) => (item.id === editingItem.id ? updatedObj : item)));
        toast.success(`Updated "${itemName}" successfully!`);
      } else {
        // CREATE ITEM
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: itemName.trim(),
            description: itemDescription.trim() || null,
            price: priceNum,
            type: itemType,
            categoryId: itemCategoryId,
            isAvailable: itemIsAvailable,
            preparationTime: itemPrepTime ? parseInt(itemPrepTime) : null,
            image: itemImage.trim() || null,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to create item");
        }

        const categoryObj = categories.find((c) => c.id === itemCategoryId);
        const newItemObj: MenuItem = {
          ...data.data,
          category: categoryObj,
        };

        setMenuItems((prev) => [newItemObj, ...prev]);
        toast.success(`Added "${itemName}" to menu!`);
      }

      setShowItemModal(false);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const newStatus = !item.isAvailable;
    setTogglingItemId(item.id);

    // Optimistic Update
    setMenuItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newStatus } : i))
    );

    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to toggle status");
      }

      toast.success(
        `${item.name} is now marked as ${newStatus ? "Available" : "Unavailable"}`
      );
    } catch (err: any) {
      // Rollback
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !newStatus } : i))
      );
      toast.error(err.message || "Failed to update availability");
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDeleteItemConfirm = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/menu/${itemToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete item");
      }

      if (data.archived) {
        setMenuItems((prev) =>
          prev.map((i) => (i.id === itemToDelete.id ? { ...i, isAvailable: false } : i))
        );
        toast.info(data.message);
      } else {
        setMenuItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
        toast.success(`Deleted "${itemToDelete.name}" successfully!`);
      }

      setShowDeleteItemModal(false);
      setItemToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // CATEGORY ACTIONS
  // ----------------------------------------------------
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.orderIndex)) + 1 : 1;
    setCategoryOrderIndex(nextOrder.toString());
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryOrderIndex(cat.orderIndex.toString());
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    const orderNum = parseInt(categoryOrderIndex) || 0;
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        // UPDATE CATEGORY
        const res = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            orderIndex: orderNum,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to update category");
        }

        const updatedCat = data.data;
        setCategories((prev) =>
          prev
            .map((c) => (c.id === editingCategory.id ? updatedCat : c))
            .sort((a, b) => a.orderIndex - b.orderIndex)
        );

        setMenuItems((prev) =>
          prev.map((i) => (i.categoryId === editingCategory.id ? { ...i, category: updatedCat } : i))
        );

        toast.success(`Category "${categoryName}" updated!`);
      } else {
        // CREATE CATEGORY
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName.trim(),
            orderIndex: orderNum,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to create category");
        }

        const newCat = data.data;
        setCategories((prev) => [...prev, newCat].sort((a, b) => a.orderIndex - b.orderIndex));
        toast.success(`Category "${categoryName}" created!`);
      }

      setShowCategoryModal(false);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete category");
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      toast.success(`Category "${categoryToDelete.name}" deleted!`);
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 sm:pb-16">
      {/* ==================================================== */}
      {/* 1. TOP STATS OVERVIEW RIBBON (Horizontal scroll on mobile, Grid on desktop) */}
      {/* ==================================================== */}
      <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
        {/* Total Items */}
        <div className="min-w-[130px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Items</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.totalItems}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">items</span>
          </div>
        </div>

        {/* Veg Items */}
        <div className="min-w-[120px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">Veg</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Leaf className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats.vegCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">items</span>
          </div>
        </div>

        {/* Non-Veg Items */}
        <div className="min-w-[120px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-rose-600 uppercase tracking-wider">Non-Veg</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <Flame className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-600">{stats.nonVegCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">items</span>
          </div>
        </div>

        {/* In Stock Items */}
        <div className="min-w-[130px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">In Stock</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.availableCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">{stats.unavailableCount} 86&apos;d</span>
          </div>
        </div>

        {/* Total Categories */}
        <div className="min-w-[120px] sm:min-w-0 flex-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">Categories</span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{stats.totalCategories}</span>
            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">groups</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. TABS & CONTROLS */}
      {/* ==================================================== */}
      <Tabs
        defaultValue="items"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "items" | "categories")}
        className="w-full space-y-3 sm:space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Segmented Tab bar */}
          <TabsList className="grid grid-cols-2 w-full sm:w-auto bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl h-11 border border-slate-200/60 dark:border-slate-800">
            <TabsTrigger
              value="items"
              className="rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Items</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 font-black">
                {menuItems.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 font-black">
                {categories.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Desktop Add Button */}
          <div className="hidden sm:block">
            {activeTab === "items" ? (
              <Button
                onClick={handleOpenAddItem}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs sm:text-sm h-10 px-4 font-bold shadow-xs active:scale-[0.98] transition-all"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Add Menu Item
              </Button>
            ) : (
              <Button
                onClick={handleOpenAddCategory}
                className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs sm:text-sm h-10 px-4 font-bold shadow-xs active:scale-[0.98] transition-all"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Add Category
              </Button>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: MENU ITEMS */}
        {/* ==================================================== */}
        <TabsContent value="items" className="focus-visible:outline-none space-y-3 sm:space-y-4">
          {/* SEARCH & FILTERS SECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 sm:p-3.5 rounded-2xl shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dishes or ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Drawer Button (< md) */}
              <button
                onClick={() => setShowMobileFilterDrawer(true)}
                className={cn(
                  "md:hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border shrink-0 transition-all h-9 sm:h-10",
                  activeFiltersCount > 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Desktop Filters Group (>= md) */}
              <div className="hidden md:flex items-center gap-2">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm px-3 py-2 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">All Categories ({menuItems.length})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({categoryCounts[cat.id] || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm px-3 py-2 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">All Types</option>
                  <option value="Veg">🥬 Veg</option>
                  <option value="Non-Veg">🍗 Non-Veg</option>
                  <option value="Egg">🥚 Egg</option>
                </select>

                <select
                  value={selectedAvailabilityFilter}
                  onChange={(e) => setSelectedAvailabilityFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm px-3 py-2 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="ALL">All Status</option>
                  <option value="AVAILABLE">✅ Available</option>
                  <option value="UNAVAILABLE">⛔ Unavailable</option>
                </select>

                {(searchQuery || activeFiltersCount > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategoryFilter("ALL");
                      setSelectedTypeFilter("ALL");
                      setSelectedAvailabilityFilter("ALL");
                    }}
                    className="text-xs text-rose-500 hover:bg-rose-50 rounded-xl h-9 px-2"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Category Scrolling Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              <button
                onClick={() => setSelectedCategoryFilter("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-manipulation",
                  selectedCategoryFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                All ({menuItems.length})
              </button>
              {categories.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-manipulation",
                      selectedCategoryFilter === cat.id
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE FILTER STATUS BAR (Mobile indicator) */}
          {activeFiltersCount > 0 && (
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold">{activeFiltersCount} filter(s) active</span>
              </div>
              <button
                onClick={() => {
                  setSelectedCategoryFilter("ALL");
                  setSelectedTypeFilter("ALL");
                  setSelectedAvailabilityFilter("ALL");
                }}
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ITEMS LIST (Mobile-First Cards on small screens, Table on desktop) */}
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Menu Items ({filteredMenuItems.length})
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs text-slate-500">
                  {filteredMenuItems.length !== menuItems.length
                    ? `Filtered ${filteredMenuItems.length} of ${menuItems.length} items`
                    : "Tap status pill to toggle live kitchen & customer stock"}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* ==================================================== */}
              {/* MOBILE CARDS VIEW (< md) */}
              {/* ==================================================== */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 space-y-2.5 transition-colors",
                      !item.isAvailable && "bg-slate-50/60 dark:bg-slate-800/30"
                    )}
                  >
                    {/* Top Row: Dietary Icon, Name, Category, Price */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Veg / Non-Veg Icon */}
                        <div
                          className={cn(
                            "w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5",
                            item.type?.toLowerCase() === "veg"
                              ? "border-emerald-600 bg-emerald-50 text-emerald-600"
                              : "border-rose-600 bg-rose-50 text-rose-600"
                          )}
                          title={item.type}
                        >
                          <div
                            className={cn(
                              "rounded-full",
                              item.type?.toLowerCase() === "veg"
                                ? "w-2 h-2 bg-emerald-600"
                                : "w-2 h-2 bg-rose-600"
                            )}
                          />
                        </div>

                        {/* Name & details */}
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-slate-900 dark:text-white block truncate leading-snug">
                            {item.name}
                          </span>
                          {item.description && (
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {item.category && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.category.name}
                              </span>
                            )}
                            {item.preparationTime && (
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {item.preparationTime}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <span className="font-black text-base text-slate-900 dark:text-white block">
                          {currency}{item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Bar: Availability Toggle & Edit/Delete Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      {/* Large Touch-friendly Toggle Switch */}
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        disabled={togglingItemId === item.id}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all active:scale-95 touch-manipulation min-h-[36px]",
                          item.isAvailable
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                            : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700"
                        )}
                      >
                        {togglingItemId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : item.isAvailable ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{item.isAvailable ? "In Stock (Available)" : "86'd (Unavailable)"}</span>
                      </button>

                      {/* Edit & Delete Action Buttons (Touch size 36px) */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 active:scale-95 transition-all touch-manipulation"
                          title="Edit Item"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete(item);
                            setShowDeleteItemModal(true);
                          }}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 active:scale-95 transition-all touch-manipulation"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredMenuItems.length === 0 && (
                  <div className="text-center py-10 px-4 space-y-3">
                    <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      No menu items match
                    </p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Adjust your search or filter tags, or add a new menu item.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleOpenAddItem}
                      className="bg-slate-900 text-white rounded-xl text-xs h-9 px-4 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Menu Item
                    </Button>
                  </div>
                )}
              </div>

              {/* ==================================================== */}
              {/* DESKTOP TABLE VIEW (>= md) */}
              {/* ==================================================== */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Item Details</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Prep Time</th>
                      <th className="py-3.5 px-4">Stock Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMenuItems.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors",
                          !item.isAvailable && "opacity-75 bg-slate-50/30"
                        )}
                      >
                        {/* Name & Description */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 mt-0.5",
                                item.type?.toLowerCase() === "veg"
                                  ? "border-emerald-600 bg-emerald-50 text-emerald-600"
                                  : "border-rose-600 bg-rose-50 text-rose-600"
                              )}
                              title={item.type}
                            >
                              <div
                                className={cn(
                                  "rounded-full",
                                  item.type?.toLowerCase() === "veg"
                                    ? "w-2 h-2 bg-emerald-600"
                                    : "w-2 h-2 bg-rose-600"
                                )}
                              />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {item.name}
                              </span>
                              {item.description && (
                                <p className="text-xs text-slate-400 line-clamp-1 max-w-sm">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border-none"
                          >
                            {item.category?.name || "Uncategorized"}
                          </Badge>
                        </td>

                        {/* Dietary Type */}
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full inline-block",
                              item.type?.toLowerCase() === "veg"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                            )}
                          >
                            {item.type}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                          {currency}{item.price.toFixed(2)}
                        </td>

                        {/* Prep Time */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                          {item.preparationTime ? (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {item.preparationTime} min
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Status Toggle Switch */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            disabled={togglingItemId === item.id}
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 cursor-pointer",
                              item.isAvailable
                                ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
                                : "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                            )}
                            title="Click to toggle availability"
                          >
                            {togglingItemId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.isAvailable ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{item.isAvailable ? "Available" : "Unavailable"}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditItem(item)}
                            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            title="Edit Item"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete(item);
                              setShowDeleteItemModal(true);
                            }}
                            className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            title="Delete Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {filteredMenuItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                          <div className="max-w-sm mx-auto space-y-2">
                            <p className="font-semibold text-slate-600 dark:text-slate-300">
                              No menu items found
                            </p>
                            <p className="text-xs text-slate-400">
                              Try clearing filters or search term to see other items.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================== */}
        {/* TAB 2: CATEGORIES */}
        {/* ==================================================== */}
        <TabsContent value="categories" className="focus-visible:outline-none space-y-3 sm:space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Menu Categories ({categories.length})
                </CardTitle>
                <CardDescription className="text-[11px] sm:text-xs text-slate-500">
                  Control the ordering of sections on customer digital QR menus & waiter order screens
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleOpenAddCategory}
                className="hidden sm:inline-flex bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-9 px-3.5"
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Add Category
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {/* MOBILE CATEGORY LIST */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                {categories.map((cat) => {
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <div
                      key={cat.id}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 shrink-0">
                          {cat.orderIndex}
                        </span>
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-slate-900 dark:text-white block truncate">
                            {cat.name}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCategoryFilter(cat.id);
                              setActiveTab("items");
                            }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 mt-0.5"
                          >
                            <span>{count} item{count === 1 ? "" : "s"}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900 active:scale-95 transition-all touch-manipulation"
                          title="Edit Category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setShowDeleteCategoryModal(true);
                          }}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 active:scale-95 transition-all touch-manipulation"
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {categories.length === 0 && (
                  <div className="text-center py-10 px-4 text-slate-400 text-xs">
                    No categories found. Click &quot;Add Category&quot; to create one.
                  </div>
                )}
              </div>

              {/* DESKTOP CATEGORY TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 w-28">Order Index</th>
                      <th className="py-3.5 px-4">Category Name</th>
                      <th className="py-3.5 px-4">Items Attached</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {categories.map((cat) => {
                      const count = categoryCounts[cat.id] || 0;
                      return (
                        <tr
                          key={cat.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-300">
                              {cat.orderIndex}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {cat.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => {
                                setSelectedCategoryFilter(cat.id);
                                setActiveTab("items");
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition"
                            >
                              <span>{count} items</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="h-8 w-8 text-slate-600 hover:text-slate-900 rounded-lg"
                              title="Edit Category"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setCategoryToDelete(cat);
                                setShowDeleteCategoryModal(true);
                              }}
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 rounded-lg"
                              title="Delete Category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}

                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-400 text-sm">
                          No categories found. Click &quot;Add Category&quot; above to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================================================== */}
      {/* 3. MOBILE FLOATING ACTION BUTTON (FAB) */}
      {/* ==================================================== */}
      <div className="fixed bottom-5 right-4 z-40 sm:hidden">
        <button
          onClick={activeTab === "items" ? handleOpenAddItem : handleOpenAddCategory}
          className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-full shadow-xl shadow-slate-900/30 font-bold text-xs active:scale-95 transition-all touch-manipulation border border-white/20"
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === "items" ? "Add Item" : "Add Category"}</span>
        </button>
      </div>

      {/* ==================================================== */}
      {/* 4. MOBILE FILTERS DRAWER */}
      {/* ==================================================== */}
      {showMobileFilterDrawer && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="w-full bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Drag handle */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mb-3" />
              <div className="flex items-center justify-between w-full">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Filters & Sorting</h3>
                <button
                  onClick={() => setShowMobileFilterDrawer(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={cn(
                    "p-2.5 rounded-xl text-xs font-semibold border text-left truncate transition-all",
                    selectedCategoryFilter === "ALL"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  )}
                >
                  All Categories ({menuItems.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={cn(
                      "p-2.5 rounded-xl text-xs font-semibold border text-left truncate transition-all",
                      selectedCategoryFilter === cat.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    {cat.name} ({categoryCounts[cat.id] || 0})
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Type */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dietary Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ALL", label: "All Types" },
                  { id: "Veg", label: "🥬 Veg" },
                  { id: "Non-Veg", label: "🍗 Non-Veg" },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedTypeFilter(type.id)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all",
                      selectedTypeFilter === type.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock Availability */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stock Availability</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "ALL", label: "All Items" },
                  { id: "AVAILABLE", label: "✅ In Stock" },
                  { id: "UNAVAILABLE", label: "⛔ 86'd" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedAvailabilityFilter(st.id)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all",
                      selectedAvailabilityFilter === st.id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategoryFilter("ALL");
                  setSelectedTypeFilter("ALL");
                  setSelectedAvailabilityFilter("ALL");
                }}
                className="flex-1 rounded-xl text-xs font-bold h-11"
              >
                Reset All
              </Button>
              <Button
                onClick={() => setShowMobileFilterDrawer(false)}
                className="flex-1 bg-slate-900 text-white rounded-xl text-xs font-bold h-11"
              >
                Apply Filters ({filteredMenuItems.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. MODAL: ADD / EDIT MENU ITEM (Bottom-sheet on mobile) */}
      {/* ==================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150 max-h-[88vh] sm:max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Drag Handle */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingItem ? `Editing "${editingItem.name}"` : "Configure dish details & pricing"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveItem} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala, Chicken Tikka"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Price ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {currency}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Dietary Classification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dietary Classification
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "Veg", label: "Veg", icon: <Leaf className="w-3.5 h-3.5 text-emerald-600" /> },
                    { type: "Non-Veg", label: "Non-Veg", icon: <Flame className="w-3.5 h-3.5 text-rose-600" /> },
                    { type: "Egg", label: "Egg", icon: <span className="text-xs">🥚</span> },
                  ].map((diet) => (
                    <button
                      key={diet.type}
                      type="button"
                      onClick={() => setItemType(diet.type)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all touch-manipulation",
                        itemType === diet.type
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {diet.icon}
                      <span>{diet.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prep Time & Stock Switch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prep Time (Mins)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 15"
                      value={itemPrepTime}
                      onChange={(e) => setItemPrepTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stock Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setItemIsAvailable(!itemIsAvailable)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-bold transition-all touch-manipulation",
                      itemIsAvailable
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40"
                        : "bg-slate-100 border-slate-300 text-slate-500"
                    )}
                  >
                    <span className="truncate">{itemIsAvailable ? "Available" : "86'd"}</span>
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0",
                        itemIsAvailable ? "bg-emerald-600" : "bg-slate-400"
                      )}
                    >
                      {itemIsAvailable ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                    </span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, allergen notes..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
              </div>

              {/* Sticky Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowItemModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial rounded-xl text-xs font-semibold h-11 sm:h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold px-5 h-11 sm:h-9"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : editingItem ? (
                    "Save Changes"
                  ) : (
                    "Add Item"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. MODAL: DELETE ITEM CONFIRMATION */}
      {/* ==================================================== */}
      {showDeleteItemModal && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-3.5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete Menu Item?</h3>
                <p className="text-xs text-slate-500">Remove this item from the active restaurant menu</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white block">
                {itemToDelete.name}
              </span>
              <span className="text-xs text-slate-500">
                {currency}{itemToDelete.price.toFixed(2)} • {itemToDelete.category?.name || "Uncategorized"}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteItemModal(false);
                  setItemToDelete(null);
                }}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial rounded-xl text-xs font-semibold h-10"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteItemConfirm}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4 h-10"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. MODAL: ADD / EDIT CATEGORY */}
      {/* ==================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                    {editingCategory ? "Edit Category" : "New Category"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Group your dishes into structured sections</p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appetizers, Main Course, Drinks"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Order Index
                </label>
                <input
                  type="number"
                  min="0"
                  value={categoryOrderIndex}
                  onChange={(e) => setCategoryOrderIndex(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Lower order indices appear first on guest menus and order taking lists.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCategoryModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial rounded-xl text-xs font-semibold h-11 sm:h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold px-5 h-11 sm:h-9"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : editingCategory ? (
                    "Save Changes"
                  ) : (
                    "Create Category"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. MODAL: DELETE CATEGORY CONFIRMATION */}
      {/* ==================================================== */}
      {showDeleteCategoryModal && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
          <div
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-3.5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 rounded-2xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Delete Category?</h3>
                <p className="text-xs text-slate-500">Remove category from the system</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white block">
                {categoryToDelete.name}
              </span>
              <span className="text-xs text-slate-500">
                Contains {categoryCounts[categoryToDelete.id] || 0} attached item(s)
              </span>
            </div>

            {(categoryCounts[categoryToDelete.id] || 0) > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Please reassign or delete the {categoryCounts[categoryToDelete.id]} item(s) inside this category first.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteCategoryModal(false);
                  setCategoryToDelete(null);
                }}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial rounded-xl text-xs font-semibold h-10"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCategoryConfirm}
                disabled={isSubmitting || (categoryCounts[categoryToDelete.id] || 0) > 0}
                className="flex-1 sm:flex-initial bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4 h-10 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
