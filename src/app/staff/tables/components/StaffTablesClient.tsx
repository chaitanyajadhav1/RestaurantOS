"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableStatus } from "@prisma/client";
import Link from "next/link";
import { Users, Armchair, PlusCircle, Zap, CheckCircle2 } from "lucide-react";

type RestaurantTable = {
  id: string;
  number: string;
  capacity: number;
  location: string | null;
  status: TableStatus;
  orders?: any[];
};

type QueueEntry = {
  id: string;
  tokenNumber: string;
  guests: number;
  customer: { name: string | null };
};

export function StaffTablesClient({ 
  initialTables, 
  calledQueue 
}: { 
  initialTables: RestaurantTable[], 
  calledQueue: QueueEntry[] 
}) {
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [queue, setQueue] = useState<QueueEntry[]>(calledQueue);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case "AVAILABLE": return "bg-green-50 text-green-900 border-green-300 dark:bg-green-950/40 dark:text-green-300";
      case "PARTIALLY_OCCUPIED": return "bg-amber-50 text-amber-950 border-amber-400 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-300";
      case "OCCUPIED": return "bg-red-50 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-300";
      case "RESERVED": return "bg-yellow-50 text-yellow-900 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300";
      case "CLEANING": return "bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300";
      default: return "bg-slate-50 text-slate-900 border-slate-300";
    }
  };

  const handleAssign = async () => {
    if (!selectedTable || !selectedQueueId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tables/${selectedTable.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId: selectedQueueId })
      });
      const json = await res.json();
      
      if (json.success) {
        toast({ 
          title: `Table ${selectedTable.number} assigned!`,
          description: `Seated as Group ${json.data.partyLabel || "A"}.`
        });
        
        // Refresh tables
        setTables(prev => prev.map(t => {
          if (t.id === selectedTable.id) {
            const nextStatus = json.data.table?.status || (t.status === "AVAILABLE" ? "PARTIALLY_OCCUPIED" : "OCCUPIED");
            return { ...t, status: nextStatus };
          }
          return t;
        }));
        setQueue(queue.filter(q => q.id !== selectedQueueId));
        setSelectedTable(null);
        setSelectedQueueId("");
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px]">Available</Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px]">Shared Table</Badge>
          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-[11px]">Full (Occupied)</Badge>
          <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 text-[11px]">Cleaning</Badge>
        </div>
        
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <Link href="/staff/addons">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl h-8 px-3">
              <Zap className="w-3.5 h-3.5 mr-1 fill-current" /> Quick Add-Ons
            </Button>
          </Link>
          <Link href="/staff/pos">
            <Button size="sm" className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl h-8 px-3">
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-amber-400" /> POS
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map(table => {
          const isSeatAvailable = table.status === 'AVAILABLE' || table.status === 'PARTIALLY_OCCUPIED';
          return (
            <Card 
              key={table.id} 
              className={`cursor-pointer transition-all hover:shadow-md border-2 rounded-2xl ${getStatusColor(table.status)}`}
              onClick={() => isSeatAvailable && setSelectedTable(table)}
            >
              <CardHeader className="p-3.5 pb-1">
                <CardTitle className="flex justify-between items-center text-base sm:text-lg">
                  <span className="font-black">T{table.number}</span>
                  <Armchair className="w-4 h-4 opacity-50" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <div className="text-xs font-semibold opacity-90 mt-1 flex items-center justify-between">
                  <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {table.capacity} Pax</span>
                  {table.status === "PARTIALLY_OCCUPIED" && (
                    <Badge className="bg-amber-500 text-slate-950 text-[9px] px-1 py-0 font-bold">Shared</Badge>
                  )}
                </div>
                <div className="text-[11px] opacity-70 mt-0.5">{table.location || "Indoor"}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              Seat Customer at Table {selectedTable?.number}
              {selectedTable?.status === "PARTIALLY_OCCUPIED" ? " (Shared Table)" : ""}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Capacity: {selectedTable?.capacity} guests ({selectedTable?.location || "Indoor"})
              {selectedTable?.status === "PARTIALLY_OCCUPIED" && " • Seats already partially occupied by another party"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-3">
            <label className="text-xs font-bold mb-1.5 block text-slate-700 dark:text-slate-300">Select Customer from Queue:</label>
            <Select value={selectedQueueId} onValueChange={(val) => val && setSelectedQueueId(val)}>
              <SelectTrigger className="h-10 rounded-xl text-xs">
                <SelectValue placeholder="Select a waiting customer..." />
              </SelectTrigger>
              <SelectContent>
                {queue.length === 0 ? (
                  <SelectItem value="none" disabled>No customers waiting</SelectItem>
                ) : (
                  queue.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.tokenNumber} - {q.customer.name || "Guest"} ({q.guests} guests)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedTable(null)} className="rounded-xl">Cancel</Button>
            <Button 
              size="sm" 
              onClick={handleAssign} 
              isLoading={loading}
              loadingText="Assigning..."
              disabled={!selectedQueueId || selectedQueueId === 'none'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              Confirm Seating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
