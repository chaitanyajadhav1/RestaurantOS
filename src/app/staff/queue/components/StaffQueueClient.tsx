"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Megaphone, X, Clock, Users } from "lucide-react";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
};

type QueueEntry = {
  id: string;
  tokenNumber: string;
  guests: number;
  preference: string | null;
  status: string;
  priority: string;
  createdAt: string;
  customer: Customer;
};

export function StaffQueueClient({ restaurantId }: { restaurantId: string }) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      const json = await res.json();
      if (json.success) setTables(json.data);
    } catch (err) {
      console.error("Failed to fetch tables");
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue");
      const json = await res.json();
      if (json.success) {
        setQueue(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchTables();
    const interval = setInterval(() => {
      fetchQueue();
      fetchTables();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchTables]);

  const handleCallClick = (id: string) => {
    setSelectedQueueId(id);
  };

  const assignTable = async (tableId: string) => {
    if (!selectedQueueId) return;
    setIsAssigning(true);
    try {
      // 1. First set the status to CALLED so the customer dashboard flashes
      // and so the assign API allows the transition.
      const callRes = await fetch(`/api/queue/${selectedQueueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CALLED" })
      });
      const callJson = await callRes.json();
      
      if (!callJson.success) {
        toast({ variant: "destructive", title: "Error", description: callJson.error });
        setIsAssigning(false);
        return;
      }

      // 2. Then assign the table
      const res = await fetch(`/api/tables/${tableId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId: selectedQueueId })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Table assigned successfully` });
        fetchQueue();
        fetchTables();
        setSelectedQueueId(null);
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    } finally {
      setIsAssigning(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Status updated to ${status}` });
        fetchQueue();
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    }
  };

  if (loading) return <div>Loading queue...</div>;

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
      <CardContent className="p-0">
        {/* MOBILE CARD VIEW (Screens < md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
          {queue.map((entry) => {
            const waitMs = new Date().getTime() - new Date(entry.createdAt).getTime();
            const waitMins = Math.floor(waitMs / 60000);

            return (
              <div 
                key={entry.id} 
                className={`p-3.5 rounded-2xl border transition-all ${
                  entry.status === 'CALLED'
                    ? 'border-blue-300 bg-blue-50/70 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-lg text-slate-900 dark:text-white">{entry.tokenNumber}</span>
                    {entry.priority === 'PRIORITY' && (
                      <Badge className="bg-amber-500 text-[10px]">VIP</Badge>
                    )}
                    <Badge variant={entry.status === 'CALLED' ? 'default' : 'outline'} className="text-[10px]">
                      {entry.status}
                    </Badge>
                  </div>

                  <span className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    <Users className="w-3.5 h-3.5 mr-1 text-slate-500" /> {entry.guests} Pax
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{entry.customer.name || 'Guest'}</span>
                    <span className="text-[11px] text-slate-500">{entry.customer.phone}</span>
                  </div>

                  <div className="text-right">
                    <span className="flex items-center text-xs text-slate-500 justify-end">
                      <Clock className="w-3 h-3 mr-1 text-amber-500" /> {waitMins}m wait
                    </span>
                    {entry.preference && (
                      <span className="text-[10px] text-slate-400 italic block">{entry.preference}</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {entry.status === 'WAITING' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleCallClick(entry.id)} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 rounded-xl text-xs"
                    >
                      <Megaphone className="w-3.5 h-3.5 mr-1" /> Call & Seat
                    </Button>
                  )}
                  {entry.status === 'CALLED' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleCallClick(entry.id)} 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 rounded-xl text-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Assign Table
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 h-9 px-3 rounded-xl" 
                    onClick={() => updateStatus(entry.id, 'CANCELLED')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {queue.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Queue is empty</p>
            </div>
          )}
        </div>

        {/* DESKTOP TABLE VIEW (Screens md+) */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Guests / Pref</TableHead>
                <TableHead>Wait Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((entry) => {
                const waitMs = new Date().getTime() - new Date(entry.createdAt).getTime();
                const waitMins = Math.floor(waitMs / 60000);

                return (
                  <TableRow key={entry.id} className={entry.status === 'CALLED' ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-lg">{entry.tokenNumber}</span>
                        {entry.priority === 'PRIORITY' && (
                          <Badge variant="destructive" className="text-[10px]">VIP</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.customer.name || 'Guest'}</div>
                      <div className="text-xs text-slate-500">{entry.customer.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> {entry.guests}</span>
                        {entry.preference && <Badge variant="secondary">{entry.preference}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 mr-1 text-amber-500"/> {waitMins}m
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.status === 'CALLED' ? 'default' : 'outline'}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {entry.status === 'WAITING' && (
                        <Button size="sm" onClick={() => handleCallClick(entry.id)} className="bg-blue-600 hover:bg-blue-700">
                          <Megaphone className="w-4 h-4 mr-1" /> Call & Seat
                        </Button>
                      )}
                      {entry.status === 'CALLED' && (
                        <Button size="sm" onClick={() => handleCallClick(entry.id)} className="bg-emerald-600 hover:bg-emerald-700">
                          <Check className="w-4 h-4 mr-1" /> Assign Table
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(entry.id, 'CANCELLED')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    The queue is currently empty.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* ASSIGN TABLE MODAL */}
      <Dialog open={!!selectedQueueId} onOpenChange={(open) => !open && setSelectedQueueId(null)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Assign Available Table</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 py-3 max-h-[60vh] overflow-y-auto pr-1">
            {tables.map((table) => {
              const isAvailable = table.status === 'AVAILABLE';
              return (
                <Button
                  key={table.id}
                  variant={isAvailable ? "outline" : "secondary"}
                  className={`h-20 flex flex-col items-center justify-center gap-0.5 border-2 rounded-xl relative transition-all ${
                    isAvailable 
                      ? 'border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-slate-900 dark:text-white' 
                      : 'border-transparent bg-slate-100 dark:bg-slate-800 opacity-50 cursor-not-allowed text-slate-400'
                  }`}
                  onClick={() => isAvailable && assignTable(table.id)}
                  disabled={isAssigning || !isAvailable}
                >
                  <span className="font-black text-base">
                    T{table.number}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {table.capacity} Pax
                  </span>
                  {!isAvailable && (
                    <span className="text-[9px] font-bold text-rose-500 uppercase">
                      Occupied
                    </span>
                  )}
                </Button>
              );
            })}
            {tables.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-8 border-2 border-dashed border-slate-200 rounded-xl">
                No tables have been created yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
