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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Bills</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                  <TableRow key={order.id} className={order.status === 'SERVED' ? 'bg-green-50' : ''}>
                    <TableCell className="font-mono font-medium text-slate-700">
                      {order.id.slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">{order.table ? `Table ${order.table.number}` : 'Takeaway'}</div>
                      <div className="text-xs text-slate-500">{order.customer?.name || 'Walk-in'}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-bold text-lg">
                      ₹{order.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button onClick={() => setSelectedOrder(order)}>
                        Review Bill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-300" />
                      All orders are settled!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ReceiptText className="w-5 h-5 mr-2" /> Receipt Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-sm shadow-inner">
                  <div className="text-center font-bold mb-4 border-b border-dashed border-slate-300 pb-2">
                    ORDER #{selectedOrder.id.slice(-6).toUpperCase()}
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <div>{item.quantity}x {item.menuItem.name}</div>
                        <div>{(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tax</span>
                      <span>{selectedOrder.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-slate-300">
                      <span>TOTAL</span>
                      <span>₹{selectedOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={paymentMethod === 'CASH' ? 'default' : 'outline'} 
                      onClick={() => setPaymentMethod('CASH')}
                      className="h-12"
                    >
                      <Banknote className="w-4 h-4 mr-1" /> Cash
                    </Button>
                    <Button 
                      variant={paymentMethod === 'CARD' ? 'default' : 'outline'} 
                      onClick={() => setPaymentMethod('CARD')}
                      className="h-12"
                    >
                      <CreditCard className="w-4 h-4 mr-1" /> Card
                    </Button>
                    <Button 
                      variant={paymentMethod === 'UPI' ? 'default' : 'outline'} 
                      onClick={() => setPaymentMethod('UPI')}
                      className="h-12"
                    >
                      <Smartphone className="w-4 h-4 mr-1" /> UPI
                    </Button>
                  </div>
                </div>

                <Button 
                  onClick={handleSettle} 
                  disabled={loading} 
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 mt-6"
                >
                  {loading ? "Processing..." : `Collect ₹${selectedOrder.total.toFixed(2)}`}
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                Select an order from the list to review and settle the bill.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
