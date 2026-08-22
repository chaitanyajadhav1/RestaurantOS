"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableStatus } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
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
  status: string;
  customer: { name: string | null };
};

export function AdminTablesClient({ 
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
      case "AVAILABLE": return "default";
      case "OCCUPIED": return "destructive";
      case "RESERVED": return "secondary";
      case "CLEANING": return "outline";
      case "OUT_OF_SERVICE": return "outline";
      default: return "default";
    }
  };

  const getGridColor = (status: TableStatus) => {
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
      // Find the selected customer
      const targetCustomer = queue.find(q => q.id === selectedQueueId);
      
      // If customer is WAITING, transition them to CALLED first
      if (targetCustomer && targetCustomer.status === 'WAITING') {
        const patchRes = await fetch(`/api/queue/${selectedQueueId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CALLED" })
        });
        
        if (!patchRes.ok) {
          throw new Error("Failed to transition customer to CALLED");
        }
      }

      // Assign the table
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
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tabs defaultValue="live" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="live">Live Floor Plan</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Table
          </Button>
        </div>

        <TabsContent value="live">
          <div className="mb-6 flex space-x-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <Badge variant="outline" className="bg-green-100 text-green-800">Available</Badge>
            <Badge variant="outline" className="bg-red-100 text-red-800">Occupied</Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Reserved</Badge>
            <Badge variant="outline" className="bg-orange-100 text-orange-800">Cleaning</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map(table => (
              <Card 
                key={table.id} 
                className={`transition-all border-2 ${getGridColor(table.status)} ${table.status === 'AVAILABLE' ? 'cursor-pointer hover:shadow-md' : ''}`}
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
                  <div className="text-xs opacity-70 mt-1">{table.location || "Main Dining"}</div>
                </CardContent>
              </Card>
            ))}
            {tables.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-12 bg-white rounded-xl border border-dashed border-slate-300">
                No tables configured. Go to Configuration to add tables.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Tables Configuration</CardTitle>
              <CardDescription>Manage table capacity, layout, and defaults.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table Number</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-bold text-slate-700">{table.number}</TableCell>
                      <TableCell>{table.capacity} Persons</TableCell>
                      <TableCell>{table.location || "Main Dining"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(table.status)} className={table.status === 'AVAILABLE' ? 'bg-green-600' : ''}>
                          {table.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        No tables configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                      {q.tokenNumber} - {q.customer.name || "Guest"} ({q.guests} guests) [{q.status}]
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
    </>
  );
}
