"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CreditCard, Smartphone, ReceiptText, CheckCircle2 } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  menuItem: { name: string };
};

type Order = {
  id: string;
  status: string;
  type: string;
  partyLabel?: string | null;
  guestCount?: number | null;
  groupName?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  table?: { number: string } | null;
  customer?: { name: string | null } | null;
  items: OrderItem[];
};

export function StaffBillingClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSettle = async () => {
    if (!selectedOrder) return;
    setLoading(true);

    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          amount: selectedOrder.total,
          method: paymentMethod
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({ title: "Payment Successful", description: `Order ${selectedOrder.id.slice(-6).toUpperCase()} settled.` });
        setOrders(orders.filter(o => o.id !== selectedOrder.id));
        setSelectedOrder(null);
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  const handleOpenReview = (order: Order) => {
    setSelectedOrder(order);
    setIsMobileModalOpen(true);
  };

  const renderReceiptContent = (order: Order) => (
    <div className="space-y-4">
      <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs sm:text-sm shadow-inner">
        <div className="text-center font-bold mb-3 border-b border-dashed border-slate-300 dark:border-slate-600 pb-2">
          ORDER #{order.id.slice(-6).toUpperCase()}
        </div>
        
        <div className="space-y-1.5 mb-3 max-h-44 overflow-y-auto">
          {order.items.map(item => (
            <div key={item.id} className="flex justify-between">
              <div className="truncate mr-2">{item.quantity}x {item.menuItem.name}</div>
              <div className="shrink-0 font-semibold">₹{(item.price * item.quantity).toFixed(2)}</div>
            </div>
          ))}
        </div>
        
        <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-2 space-y-1">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tax</span>
            <span>₹{order.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base sm:text-lg font-black mt-2 pt-2 border-t border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
            <span>TOTAL</span>
            <span>₹{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Payment Method</label>
        <div className="grid grid-cols-3 gap-2">
          <Button 
            type="button"
            variant={paymentMethod === 'CASH' ? 'default' : 'outline'} 
            onClick={() => setPaymentMethod('CASH')}
            className="h-11 rounded-xl text-xs font-bold"
          >
            <Banknote className="w-4 h-4 mr-1 text-emerald-500" /> Cash
          </Button>
          <Button 
            type="button"
            variant={paymentMethod === 'CARD' ? 'default' : 'outline'} 
            onClick={() => setPaymentMethod('CARD')}
            className="h-11 rounded-xl text-xs font-bold"
          >
            <CreditCard className="w-4 h-4 mr-1 text-blue-500" /> Card
          </Button>
          <Button 
            type="button"
            variant={paymentMethod === 'UPI' ? 'default' : 'outline'} 
            onClick={() => setPaymentMethod('UPI')}
            className="h-11 rounded-xl text-xs font-bold"
          >
            <Smartphone className="w-4 h-4 mr-1 text-purple-500" /> UPI
          </Button>
        </div>
      </div>

      <Button 
        onClick={handleSettle} 
        isLoading={loading}
        loadingText="Processing Payment..."
        className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
      >
        Collect ₹{order.total.toFixed(2)}
      </Button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg sm:text-xl">Pending Bills ({orders.length})</CardTitle>
          </CardHeader>
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
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                        {order.status}
                      </Badge>
                    </div>
                    <span className="font-black text-lg text-slate-900 dark:text-white">
                      ₹{order.total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {order.table ? `Table ${order.table.number}` : 'Takeaway'}
                        {order.partyLabel && (
                          <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.2 rounded font-black">
                            Group {order.partyLabel}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {order.customer?.name || (order.guestCount ? `${order.guestCount} Guests` : 'Walk-in Guest')}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <Button 
                      onClick={() => handleOpenReview(order)}
                      size="sm"
                      className="w-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold h-9 rounded-xl text-xs"
                    >
                      <ReceiptText className="w-3.5 h-3.5 mr-1" /> Settle Bill
                    </Button>
                  </div>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">All orders are settled!</p>
                </div>
              )}
            </div>

            {/* DESKTOP TABLE VIEW (Screens md+) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Table/Customer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className={order.status === 'SERVED' ? 'bg-green-50/60 dark:bg-green-950/20' : ''}>
                      <TableCell className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        #{order.id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold flex items-center space-x-1.5">
                          <span>{order.table ? `Table ${order.table.number}` : 'Takeaway'}</span>
                          {order.partyLabel && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded font-black">
                              Group {order.partyLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{order.customer?.name || (order.guestCount ? `${order.guestCount} Guests` : 'Walk-in')}</div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        ₹{order.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button onClick={() => setSelectedOrder(order)} size="sm">
                          Review Bill
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                        All orders are settled!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DESKTOP RECEIPT CARD */}
      <div className="hidden lg:block">
        <Card className="sticky top-6 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <ReceiptText className="w-4 h-4 mr-2 text-indigo-600" /> Receipt Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              renderReceiptContent(selectedOrder)
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                Select an order from the list to review and settle the bill.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MOBILE RECEIPT / CHECKOUT DIALOG */}
      <Dialog open={isMobileModalOpen && !!selectedOrder} onOpenChange={(open) => !open && setIsMobileModalOpen(false)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl lg:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <ReceiptText className="w-4 h-4 mr-2 text-indigo-600" /> Settle & Print Receipt
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && renderReceiptContent(selectedOrder)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
