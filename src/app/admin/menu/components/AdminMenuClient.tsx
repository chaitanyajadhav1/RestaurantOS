"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, UtensilsCrossed, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Category = {
  id: string;
  name: string;
  orderIndex: number;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  isAvailable: boolean;
  preparationTime: number | null;
  categoryId: string;
  category?: Category;
};

export function AdminMenuClient({
  initialCategories,
  initialMenuItems,
}: {
  initialCategories: Category[];
  initialMenuItems: MenuItem[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);

  return (
    <Tabs defaultValue="items" className="w-full">
      <TabsList className="mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <TabsTrigger value="items" className="rounded-lg text-xs sm:text-sm font-bold">
          <UtensilsCrossed className="w-3.5 h-3.5 mr-1.5" /> Menu Items ({menuItems.length})
        </TabsTrigger>
        <TabsTrigger value="categories" className="rounded-lg text-xs sm:text-sm font-bold">
          <Layers className="w-3.5 h-3.5 mr-1.5" /> Categories ({categories.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="items">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6">
            <div>
              <CardTitle className="text-lg sm:text-xl">Menu Items</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Manage your food and beverage items.</CardDescription>
            </div>
            <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs h-9 px-3.5">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Card View (Screens < md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-2.5">
              {menuItems.map((item) => (
                <div key={item.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">{item.name}</span>
                      {item.category && (
                        <span className="text-[11px] text-slate-500 font-medium">{item.category.name}</span>
                      )}
                    </div>
                    <span className="font-black text-sm text-slate-900 dark:text-white shrink-0">
                      ₹{item.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center space-x-1.5">
                      <Badge variant={item.type === "Veg" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {item.type}
                      </Badge>
                      {item.isAvailable ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px] px-1.5 py-0">Available</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 border-slate-300 text-[10px] px-1.5 py-0">Unavailable</Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {menuItems.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No menu items found.
                </div>
              )}
            </div>

            {/* Desktop Table View (Screens md+) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category?.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.type === "Veg" ? "default" : "destructive"}>
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell>
                        {item.isAvailable ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">Available</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">Unavailable</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {menuItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No menu items found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="categories">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6">
            <div>
              <CardTitle className="text-lg sm:text-xl">Categories</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Organize your menu items into categories.</CardDescription>
            </div>
            <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl text-xs h-9 px-3.5">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Add Category
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Card View (Screens < md) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                      {cat.orderIndex}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No categories found.
                </div>
              )}
            </div>

            {/* Desktop Table View (Screens md+) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="w-20 font-bold text-slate-500">{cat.orderIndex}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{cat.name}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
