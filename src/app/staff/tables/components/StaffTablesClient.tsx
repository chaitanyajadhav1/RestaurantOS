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
    <div>
      <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-100 text-green-800">Available</Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800">Occupied</Badge>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Reserved</Badge>
          <Badge variant="outline" className="bg-orange-100 text-orange-800">Cleaning</Badge>
        </div>
        <div className="text-sm font-medium text-slate-600">
          Customers waiting to be seated: <strong className="text-slate-900">{queue.length}</strong>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => (
          <Card 
            key={table.id} 
            className={`cursor-pointer transition-all hover:shadow-md border-2 ${getStatusColor(table.status)}`}
            onClick={() => table.status === 'AVAILABLE' && setSelectedTable(table)}
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex justify-between items-center text-lg">
                <span>{table.number}</span>
                <Armchair className="w-4 h-4 opacity-50" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xs font-medium opacity-80 mt-2 flex items-center">
                <Users className="w-3 h-3 mr-1" /> Capacity: {table.capacity}
              </div>
              <div className="text-xs opacity-70 mt-1">{table.location}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Table {selectedTable?.number}</DialogTitle>
            <DialogDescription>
              Capacity: {selectedTable?.capacity} guests
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Select customer from queue:</label>
            <Select value={selectedQueueId} onValueChange={(val) => val && setSelectedQueueId(val)}>
              <SelectTrigger>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTable(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={loading || !selectedQueueId || selectedQueueId === 'none'}>
              {loading ? "Assigning..." : "Seat Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
