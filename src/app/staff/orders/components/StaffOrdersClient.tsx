"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Eye } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  specialInstructions: string | null;
  menuItem: { name: string };
};

type Order = {
  id: string;
  status: string;
  type: string;
  total: number;
  createdAt: string;
  table?: { number: string } | null;
  customer?: { name: string | null } | null;
  items: OrderItem[];
};

export function StaffOrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders] = useState<Order[]>(initialOrders);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PLACED": return <Badge variant="outline" className="bg-slate-100 text-slate-800">Placed</Badge>;
      case "CONFIRMED": return <Badge variant="outline" className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case "PREPARING": return <Badge variant="outline" className="bg-orange-100 text-orange-800">Preparing</Badge>;
      case "READY": return <Badge variant="outline" className="bg-green-100 text-green-800">Ready</Badge>;
      case "SERVED": return <Badge variant="outline" className="bg-purple-100 text-purple-800">Served</Badge>;
      case "COMPLETED": return <Badge variant="secondary">Completed</Badge>;
      case "CANCELLED": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardContent className="p-0">
        {/* MOBILE CARD VIEW (Screens < md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-2.5">
          {orders.map((order) => (
            <div key={order.id} className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    #{order.id.slice(-6).toUpperCase()}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <span className="font-black text-base text-slate-900 dark:text-white">
                  ₹{order.total.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {order.table ? `Table ${order.table.number}` : (order.customer?.name || 'Walk-in Guest')}
                  </span>
                  <span className="text-[11px] text-slate-400 capitalize">
                    {order.type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Dialog>
                  <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl" />}>
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" /> View {order.items.length} Items
                  </DialogTrigger>
                  <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex justify-between items-center text-base">
                        <span>Order Details</span>
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                      <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between items-start pt-2">
                            <div>
                              <span className="font-black text-sm text-slate-900 dark:text-white">{item.quantity}x </span>
                              <span className="font-medium text-xs text-slate-800 dark:text-slate-200">{item.menuItem.name}</span>
                              {item.specialInstructions && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 italic mt-0.5">Note: {item.specialInstructions}</p>
                              )}
                            </div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex justify-between items-center text-lg font-black bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                        <span>Total</span>
                        <span>₹{order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-50" />
              No orders found
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW (Screens md+) */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Type / Table</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                    {order.id.slice(-8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.type.replace('_', ' ')}</div>
                    <div className="text-xs text-slate-500">
                      {order.table ? `Table ${order.table.number}` : (order.customer?.name || 'Walk-in')}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-white">
                    ₹{order.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
                        <Eye className="w-4 h-4 mr-2" /> View
                      </DialogTrigger>
                      <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex justify-between items-center">
                            <span>Order Details</span>
                            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">{order.id.slice(-8).toUpperCase()}</span>
                          </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] mt-4">
                          <div className="space-y-4">
                            {order.items.map(item => (
                              <div key={item.id} className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-2">
                                <div>
                                  <span className="font-semibold">{item.quantity}x </span>
                                  <span>{item.menuItem.name}</span>
                                  {item.specialInstructions && (
                                    <p className="text-xs text-red-500 italic mt-1">Note: {item.specialInstructions}</p>
                                  )}
                                </div>
                                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 flex justify-between items-center text-xl font-bold bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <span>Total</span>
                            <span>₹{order.total.toFixed(2)}</span>
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
