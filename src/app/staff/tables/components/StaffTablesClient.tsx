"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableStatus } from "@prisma/client";
import { Users, Armchair } from "lucide-react";

type RestaurantTable = {
  id: string;
  number: string;
  capacity: number;
  location: string | null;
  status: TableStatus;
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
      case "AVAILABLE": return "bg-green-100 text-green-800 border-green-300";
      case "OCCUPIED": return "bg-red-100 text-red-800 border-red-300";
      case "RESERVED": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "CLEANING": return "bg-orange-100 text-orange-800 border-orange-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
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
        toast({ title: `Table ${selectedTable.number} assigned successfully!` });
        // Update local state
        setTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: "OCCUPIED" } : t));
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
          <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 text-[11px]">Occupied</Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px]">Cleaning</Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[11px]">Reserved</Badge>
        </div>
        <div className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
          Waiting in Queue: <strong className="text-slate-900 dark:text-white font-bold">{queue.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tables.map(table => (
          <Card 
            key={table.id} 
            className={`cursor-pointer transition-all hover:shadow-md border-2 rounded-2xl ${getStatusColor(table.status)}`}
            onClick={() => table.status === 'AVAILABLE' && setSelectedTable(table)}
          >
            <CardHeader className="p-3.5 pb-1">
              <CardTitle className="flex justify-between items-center text-base sm:text-lg">
                <span className="font-black">T{table.number}</span>
                <Armchair className="w-4 h-4 opacity-50" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="text-xs font-semibold opacity-90 mt-1 flex items-center">
                <Users className="w-3 h-3 mr-1" /> {table.capacity} Pax
              </div>
              <div className="text-[11px] opacity-70 mt-0.5">{table.location || "Indoor"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Seat Customer at Table {selectedTable?.number}</DialogTitle>
            <DialogDescription className="text-xs">
              Capacity: {selectedTable?.capacity} guests ({selectedTable?.location || "Indoor"})
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
              onClick={handleAssign} 
              disabled={loading || !selectedQueueId || selectedQueueId === 'none'}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              {loading ? "Assigning..." : "Seat Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
