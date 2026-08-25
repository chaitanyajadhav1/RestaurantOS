"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TableStatus } from "@prisma/client";
import { 
  Users, Armchair, PlusCircle, Edit3, Trash2, CheckCircle2, 
  Phone, Sparkles, RefreshCw, X, ArrowRight,
  Move, Check, Bell, Save, Sliders, Utensils, AlertTriangle,
  LayoutGrid, Layers, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type RestaurantTable = {
  id: string;
  number: string;
  capacity: number;
  location: string | null;
  status: TableStatus;
  orders?: any[];
};

export type QueueEntry = {
  id: string;
  tokenNumber: string;
  guests: number;
  preference: string | null;
  status: string;
  priority: string;
  createdAt: string;
  customer: {
    id: string;
    name: string | null;
    phone: string;
  };
};

export type FloorLayoutConfig = {
  gridRows: number;
  gridCols: number;
  positions: Record<string, { row: number; col: number; section?: string; shape?: string }>;
};

interface UnifiedFloorQueueClientProps {
  initialTables: RestaurantTable[];
  initialQueue: QueueEntry[];
  initialLayout: FloorLayoutConfig;
  restaurantId: string;
  userRole: string;
}

export function UnifiedFloorQueueClient({
  initialTables,
  initialQueue,
  initialLayout,
  restaurantId,
  userRole
}: UnifiedFloorQueueClientProps) {
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue);
  const [layout, setLayout] = useState<FloorLayoutConfig>(initialLayout);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [queueFilter, setQueueFilter] = useState<string>("ALL");
  const [mobileTab, setMobileTab] = useState<"TABLES" | "QUEUE" | "FLOOR">("TABLES");
  const [mobileStatusFilter, setMobileStatusFilter] = useState<string>("ALL");

  // Selection & Modal States
  const [draggedQueue, setDraggedQueue] = useState<QueueEntry | null>(null);
  const [dragOverTableId, setDragOverTableId] = useState<string | null>(null);
  const [selectedTableForManage, setSelectedTableForManage] = useState<RestaurantTable | null>(null);
  const [selectedTableForAssign, setSelectedTableForAssign] = useState<RestaurantTable | null>(null);
  const [selectedQueueToSeat, setSelectedQueueToSeat] = useState<QueueEntry | null>(null);
  
  // Table Edit/Add State
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [newTableLocation, setNewTableLocation] = useState("Indoor");
  const [newTableGridPos, setNewTableGridPos] = useState<{ row: number; col: number } | null>(null);

  // Walk-In Customer Modal State
  const [isAddWalkInOpen, setIsAddWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInGuests, setWalkInGuests] = useState("2");
  const [walkInPriority, setWalkInPriority] = useState("NORMAL");
  const [walkInPreference, setWalkInPreference] = useState("");

  const [loadingAction, setLoadingAction] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const { toast } = useToast();

  // Calculate dynamic grid dimensions
  const gridCols = Math.max(layout.gridCols || 6, 6);
  const minRowsNeeded = Math.ceil((tables.length + 6) / gridCols);
  const gridRows = Math.max(layout.gridRows || 6, minRowsNeeded, 5);

  // Collision-Free Slot Allocator
  useEffect(() => {
    let hasChanges = false;
    const newPositions: Record<string, { row: number; col: number; section?: string }> = { ...layout.positions };
    const occupiedKeys = new Set<string>();

    // 1. Register valid unique positions
    tables.forEach(t => {
      const pos = newPositions[t.id];
      if (pos && pos.row >= 0 && pos.row < gridRows && pos.col >= 0 && pos.col < gridCols) {
        const key = `${pos.row},${pos.col}`;
        if (!occupiedKeys.has(key)) {
          occupiedKeys.add(key);
        } else {
          delete newPositions[t.id];
          hasChanges = true;
        }
      } else if (pos) {
        delete newPositions[t.id];
        hasChanges = true;
      }
    });

    // 2. Assign unique open slots to tables without valid positions
    let currentR = 0;
    let currentC = 0;

    tables.forEach(t => {
      if (!newPositions[t.id]) {
        hasChanges = true;
        while (occupiedKeys.has(`${currentR},${currentC}`)) {
          currentC++;
          if (currentC >= gridCols) {
            currentC = 0;
            currentR++;
          }
        }
        newPositions[t.id] = { row: currentR, col: currentC, section: t.location || "Indoor" };
        occupiedKeys.add(`${currentR},${currentC}`);
        currentC++;
        if (currentC >= gridCols) {
          currentC = 0;
          currentR++;
        }
      }
    });

    if (hasChanges) {
      setLayout(prev => ({
        ...prev,
        gridRows: Math.max(prev.gridRows || 5, currentR + 1),
        gridCols,
        positions: newPositions
      }));
    }
  }, [tables, gridRows, gridCols, layout.positions]);

  // Polling for live updates every 4 seconds
  const fetchLiveData = useCallback(async () => {
    try {
      const [tRes, qRes] = await Promise.all([
        fetch("/api/tables"),
        fetch("/api/queue")
      ]);
      const tJson = await tRes.json();
      const qJson = await qRes.json();
      if (tJson.success) setTables(tJson.data);
      if (qJson.success) setQueue(qJson.data);
    } catch (err) {
      console.error("Live fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchLiveData, 4000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // Helper status badges (compact)
  const getStatusBadge = (status: TableStatus) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="bg-emerald-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md">Available</span>;
      case "OCCUPIED":
        return <span className="bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md">Occupied</span>;
      case "CLEANING":
        return <span className="bg-amber-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md">Cleaning</span>;
      case "RESERVED":
        return <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-md">Reserved</span>;
      default:
        return <span className="border text-[10px] px-1.5 py-0.5 rounded-md">{status}</span>;
    }
  };

  const getTableCardStyle = (status: TableStatus, isHoveredTarget: boolean) => {
    if (isHoveredTarget) {
      return "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 shadow-md scale-[1.02] transition-all";
    }
    switch (status) {
      case "AVAILABLE":
        return "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-950 hover:shadow-sm transition-all";
      case "OCCUPIED":
        return "border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 hover:border-rose-300 text-rose-950 hover:shadow-sm transition-all";
      case "CLEANING":
        return "border-amber-200 bg-amber-50/70 hover:bg-amber-50 hover:border-amber-400 text-amber-950 hover:shadow-sm transition-all";
      case "RESERVED":
        return "border-blue-200 bg-blue-50/60 hover:bg-blue-50 hover:border-blue-400 text-blue-950 hover:shadow-sm transition-all";
      default:
        return "border-slate-200 bg-white text-slate-900";
    }
  };

  // Seating Handler
  const handleAssignCustomerToTable = async (tableId: string, queueId: string) => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/tables/${tableId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId })
      });
      const json = await res.json();

      if (json.success) {
        toast({ title: "Customer Seated", description: "Table marked Occupied." });
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: TableStatus.OCCUPIED } : t));
        setQueue(prev => prev.filter(q => q.id !== queueId));
        setSelectedTableForAssign(null);
        setSelectedQueueToSeat(null);
        fetchLiveData();
      } else {
        toast({ variant: "destructive", title: "Failed", description: json.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Network error" });
    } finally {
      setLoadingAction(false);
    }
  };

  // Drag and Drop Seating
  const handleDropToSeat = (tableId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTableId(null);
    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      const parsed = JSON.parse(data);
      if (parsed.queueId) {
        handleAssignCustomerToTable(tableId, parsed.queueId);
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  // Update Table Status
  const handleUpdateTableStatus = async (tableId: string, newStatus: TableStatus) => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Table set to ${newStatus.replace('_', ' ')}` });
        setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
        setSelectedTableForManage(null);
        fetchLiveData();
      } else {
        toast({ variant: "destructive", title: "Failed", description: json.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoadingAction(false);
    }
  };

  // Call Customer in Queue
  const handleCallQueue = async (queueId: string) => {
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CALLED" })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "📢 Customer Alerted!" });
        setQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: "CALLED" } : q));
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  // Cancel Queue Entry
  const handleCancelQueue = async (queueId: string) => {
    try {
      const res = await fetch(`/api/queue/${queueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Cancelled" });
        setQueue(prev => prev.filter(q => q.id !== queueId));
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  // Add Walk-In Customer
  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInPhone || !walkInGuests) return;
    setLoadingAction(true);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          name: walkInName || "Guest",
          phone: walkInPhone,
          guests: parseInt(walkInGuests),
          priority: walkInPriority,
          preference: walkInPreference
        })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Token #${json.data.tokenNumber} Generated!` });
        setIsAddWalkInOpen(false);
        setWalkInName("");
        setWalkInPhone("");
        setWalkInGuests("2");
        setWalkInPreference("");
        fetchLiveData();
      } else {
        toast({ variant: "destructive", title: "Failed", description: json.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoadingAction(false);
    }
  };

  // Save Floor Layout
  const handleSaveLayout = async () => {
    setIsSavingLayout(true);
    try {
      const res = await fetch("/api/tables/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ floorPlan: layout })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "✅ Layout Saved!" });
        setIsEditMode(false);
      } else {
        toast({ variant: "destructive", title: "Save failed", description: json.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setIsSavingLayout(false);
    }
  };

  // Move table on grid in edit mode
  const handleTableMove = (tableId: string, targetRow: number, targetCol: number) => {
    const existingTableIdAtSlot = Object.keys(layout.positions).find(
      id => id !== tableId && layout.positions[id].row === targetRow && layout.positions[id].col === targetCol
    );

    const newPositions = { ...layout.positions };
    
    if (existingTableIdAtSlot) {
      const currentPos = newPositions[tableId] || { row: 0, col: 0 };
      newPositions[existingTableIdAtSlot] = { ...newPositions[existingTableIdAtSlot], row: currentPos.row, col: currentPos.col };
    }

    newPositions[tableId] = {
      ...newPositions[tableId],
      row: targetRow,
      col: targetCol
    };

    setLayout(prev => ({ ...prev, positions: newPositions }));
  };

  // Add New Table
  const handleCreateNewTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber || !newTableCapacity) return;
    setLoadingAction(true);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: newTableNumber,
          capacity: newTableCapacity,
          location: newTableLocation
        })
      });
      const json = await res.json();
      if (json.success) {
        const createdTable: RestaurantTable = json.data;
        toast({ title: `Table ${createdTable.number} Created!` });
        
        const pos = newTableGridPos || { row: 0, col: 0 };
        const newPositions = { ...layout.positions, [createdTable.id]: { row: pos.row, col: pos.col, section: newTableLocation } };
        setLayout(prev => ({ ...prev, positions: newPositions }));
        setTables(prev => [...prev, createdTable]);
        
        setIsAddTableOpen(false);
        setNewTableNumber("");
        setNewTableCapacity("4");
        setNewTableGridPos(null);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete Table
  const handleDeleteTable = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      const res = await fetch(`/api/tables/${tableId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Table deleted" });
        setTables(prev => prev.filter(t => t.id !== tableId));
        const newPositions = { ...layout.positions };
        delete newPositions[tableId];
        setLayout(prev => ({ ...prev, positions: newPositions }));
        setEditingTable(null);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error deleting table" });
    }
  };

  // Diagram Layout Preset
  const handleApplyPreset = () => {
    const newPositions: Record<string, { row: number; col: number; section: string }> = {};
    const sorted = [...tables].sort((a, b) => {
      const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.number.replace(/\D/g, '')) || 0;
      return numA - numB || a.number.localeCompare(b.number);
    });
    
    sorted.forEach((t, i) => {
      let r = 0;
      let c = 0;
      if (i < 2) {
        r = 0; c = i;
      } else if (i < 4) {
        r = 1; c = i - 2;
      } else if (i < 8) {
        r = 2; c = i - 4;
      } else if (i < 10) {
        r = 3; c = i - 8;
      } else {
        const rem = i - 10;
        r = 4 + Math.floor(rem / 4);
        c = rem % 4;
      }
      newPositions[t.id] = { row: r, col: c, section: t.location || "Indoor" };
    });

    const maxR = Math.max(...Object.values(newPositions).map(p => p.row), 4);
    setLayout(prev => ({ ...prev, gridRows: maxR + 1, gridCols: 6, positions: newPositions }));
    toast({ title: "Preset applied! Click 'Save Floor Plan' to keep changes." });
  };

  // Filtered Queue
  const filteredQueue = queue.filter(q => {
    if (queueFilter === "WAITING") return q.status === "WAITING";
    if (queueFilter === "CALLED") return q.status === "CALLED";
    if (queueFilter === "VIP") return q.priority === "PRIORITY";
    return q.status === "WAITING" || q.status === "CALLED";
  });

  // Quick stats
  const totalTables = tables.length;
  const occupiedCount = tables.filter(t => t.status === "OCCUPIED").length;
  const availableCount = tables.filter(t => t.status === "AVAILABLE").length;
  const cleaningCount = tables.filter(t => t.status === "CLEANING").length;
  const occupancyPercent = totalTables > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  // Build 2D grid matrix
  const gridMatrix: (RestaurantTable | null)[][] = Array.from({ length: gridRows }, () =>
    Array.from({ length: gridCols }, () => null)
  );

  const placedTableIds = new Set<string>();

  tables.forEach(table => {
    const pos = layout.positions[table.id];
    if (pos && pos.row < gridRows && pos.col < gridCols && !gridMatrix[pos.row][pos.col]) {
      gridMatrix[pos.row][pos.col] = table;
      placedTableIds.add(table.id);
    }
  });

  const unplacedTables = tables.filter(t => !placedTableIds.has(t.id));
  const sections = Array.from(new Set(tables.map(t => t.location || "Indoor").filter(Boolean)));

  // Filter tables for Mobile Tables tab
  const mobileFilteredTables = tables.filter(t => {
    const sectionMatch = selectedSection === "ALL" || (t.location || "Indoor") === selectedSection;
    const statusMatch = mobileStatusFilter === "ALL" || t.status === mobileStatusFilter;
    return sectionMatch && statusMatch;
  });

  const renderQueueItem = (entry: QueueEntry) => {
    const isBeingDragged = draggedQueue?.id === entry.id;
    const isSelected = selectedQueueToSeat?.id === entry.id;

    return (
      <div
        key={entry.id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ queueId: entry.id, guests: entry.guests, tokenNumber: entry.tokenNumber })
          );
          setDraggedQueue(entry);
        }}
        onDragEnd={() => setDraggedQueue(null)}
        onClick={() => {
          if (selectedQueueToSeat?.id === entry.id) {
            setSelectedQueueToSeat(null);
          } else {
            setSelectedQueueToSeat(entry);
            toast({ title: `Token ${entry.tokenNumber} Selected`, description: "Click any green table to seat." });
          }
        }}
        className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative ${
          isSelected
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-400/50 shadow-xs"
            : isBeingDragged
            ? "opacity-40 border-dashed border-indigo-400 bg-indigo-50"
            : entry.status === "CALLED"
            ? "border-blue-300 bg-blue-50/70 hover:shadow-xs dark:bg-blue-950/30"
            : entry.priority === "PRIORITY"
            ? "border-amber-300 bg-amber-50/60 hover:shadow-xs dark:bg-amber-950/30"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-300 hover:shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
              {entry.tokenNumber}
            </span>
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
              {entry.customer.name || "Guest"}
            </span>
            {entry.priority === "PRIORITY" && (
              <Badge className="bg-amber-500 text-[9px] py-0 px-1 shrink-0">VIP</Badge>
            )}
            {entry.status === "CALLED" && (
              <Badge className="bg-blue-600 text-[9px] py-0 px-1 animate-pulse shrink-0">CALL</Badge>
            )}
          </div>

          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
            {entry.guests} Pax
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>{entry.customer.phone}</span>
          {entry.preference && (
            <span className="italic text-[10px] text-slate-400 truncate max-w-[100px]">
              {entry.preference}
            </span>
          )}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {entry.status === "WAITING" ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCallQueue(entry.id);
                }}
                className="text-blue-600 font-bold hover:underline flex items-center py-1"
              >
                <Bell className="w-3 h-3 mr-1" /> Call
              </button>
            ) : (
              <span className="text-blue-600 font-semibold flex items-center">
                <Check className="w-3 h-3 mr-1" /> Called
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (selectedQueueToSeat?.id === entry.id) {
                  setSelectedQueueToSeat(null);
                } else {
                  setSelectedQueueToSeat(entry);
                  toast({ title: `Token ${entry.tokenNumber} Ready to Seat`, description: "Tap any Available table to seat!" });
                }
              }}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center py-1"
            >
              <Armchair className="w-3 h-3 mr-1" /> Seat Guest
            </button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCancelQueue(entry.id);
            }}
            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Cancel token"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const renderTableCard = (table: RestaurantTable, isHoveredTarget = false) => {
    return (
      <div
        key={table.id}
        draggable={isEditMode}
        onDragStart={(e) => {
          if (isEditMode) e.dataTransfer.setData("text/plain", table.id);
        }}
        onDragOver={(e) => {
          if (!isEditMode && table.status === "AVAILABLE") {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDragOverTableId(table.id);
          }
        }}
        onDragLeave={() => {
          if (dragOverTableId === table.id) setDragOverTableId(null);
        }}
        onDrop={(e) => {
          if (!isEditMode && table.status === "AVAILABLE") handleDropToSeat(table.id, e);
        }}
        onClick={() => {
          if (isEditMode) {
            setEditingTable(table);
          } else if (selectedQueueToSeat && table.status === "AVAILABLE") {
            handleAssignCustomerToTable(table.id, selectedQueueToSeat.id);
          } else if (table.status === "AVAILABLE") {
            setSelectedTableForAssign(table);
          } else if (table.status === "OCCUPIED" || table.status === "CLEANING" || table.status === "RESERVED") {
            setSelectedTableForManage(table);
          }
        }}
        className={`min-h-[110px] rounded-xl border p-2.5 flex flex-col justify-between select-none relative shadow-2xs cursor-pointer active:scale-98 transition-all ${
          isEditMode ? "cursor-move border-indigo-400 bg-white ring-1 ring-indigo-200" : getTableCardStyle(table.status, isHoveredTarget)
        }`}
      >
        {/* Top: Table Number & Status */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-1">
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">
                {table.number}
              </span>
              {isEditMode && <Edit3 className="w-3 h-3 text-indigo-500" />}
            </div>
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider block">
              {table.location || "Indoor"}
            </span>
          </div>

          <div>
            {getStatusBadge(table.status)}
          </div>
        </div>

        {/* Middle: Details */}
        <div className="my-auto py-1">
          {table.status === "OCCUPIED" ? (
            <div className="text-[11px]">
              {table.orders && table.orders[0] ? (
                <div>
                  <p className="font-bold text-rose-950 dark:text-rose-200 truncate">
                    {table.orders[0].customer?.name || "Dine-in"}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center">
                    <Utensils className="w-2.5 h-2.5 mr-0.5 text-rose-500" />
                    {table.orders[0].items?.length || 0} items
                    {table.orders[0].total > 0 && ` • ₹${table.orders[0].total}`}
                  </p>
                </div>
              ) : (
                <p className="font-semibold text-rose-700 text-[10px]">Customer Seated</p>
              )}
            </div>
          ) : table.status === "CLEANING" ? (
            <div className="text-[10px] text-amber-700 font-medium flex items-center">
              <Sparkles className="w-3 h-3 mr-0.5 text-amber-500" />
              Ready for wipe
            </div>
          ) : isHoveredTarget ? (
            <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded text-center animate-bounce">
              Drop to Seat!
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 flex items-center">
              <Users className="w-3 h-3 mr-1 text-emerald-600" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {table.capacity} Seats
              </span>
            </div>
          )}
        </div>

        {/* Bottom: Capacity & Action */}
        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 font-medium">
            Cap: {table.capacity}
          </span>
          {table.status === "AVAILABLE" && !isEditMode && (
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center hover:underline">
              Seat <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
            </span>
          )}
          {table.status === "CLEANING" && !isEditMode && (
            <span className="text-amber-800 font-bold bg-amber-200 dark:bg-amber-900/60 dark:text-amber-300 px-1 rounded text-[9px]">
              Clean
            </span>
          )}
          {table.status === "OCCUPIED" && !isEditMode && (
            <span className="text-rose-700 dark:text-rose-400 font-semibold text-[9px]">
              Manage
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {/* TOP CONTROL BAR: METRICS & ACTIONS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        
        {/* Status Metrics Pills with horizontal scroll */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold shrink-0">
            <Armchair className="w-3.5 h-3.5 text-slate-500" />
            <span>Total: {totalTables}</span>
          </div>
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{availableCount} Avail</span>
          </div>
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>{occupiedCount} Occ ({occupancyPercent}%)</span>
          </div>
          {cleaningCount > 0 && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold shrink-0">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{cleaningCount} Clean</span>
            </div>
          )}
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold shrink-0">
            <Users className="w-3 h-3 text-blue-500" />
            <span>Queue: {queue.filter(q => q.status === "WAITING").length}</span>
          </div>
        </div>

        {/* Actions & Walk-In */}
        <div className="flex items-center space-x-2 shrink-0 justify-between md:justify-end">
          {selectedQueueToSeat && (
            <div className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center animate-pulse border border-emerald-300 dark:border-emerald-800">
              <span>Token {selectedQueueToSeat.tokenNumber}</span>
              <button onClick={() => setSelectedQueueToSeat(null)} className="ml-1.5 hover:text-black">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <Button
            onClick={() => setIsAddWalkInOpen(true)}
            size="sm"
            className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold px-3 rounded-xl shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Add Walk-In
          </Button>

          {['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'].includes(userRole) && (
            <>
              {isEditMode ? (
                <div className="flex items-center space-x-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleApplyPreset}
                    className="h-8 text-xs px-2 border-dashed rounded-xl"
                  >
                    <Sliders className="w-3 h-3 mr-1" />
                    Preset
                  </Button>
                  <Button
                    onClick={handleSaveLayout}
                    disabled={isSavingLayout}
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2.5 rounded-xl"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {isSavingLayout ? "Saving..." : "Save Layout"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditMode(false)}
                    className="h-8 text-xs text-slate-500 px-2 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsEditMode(true)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-slate-300 text-slate-700 dark:text-slate-200 font-medium px-2.5 hover:bg-slate-100 rounded-xl"
                >
                  <Move className="w-3.5 h-3.5 mr-1" />
                  Edit Layout
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* MOBILE VIEW SWITCHER (Visible on screens < lg) */}
      <div className="lg:hidden flex p-1 bg-slate-200/70 dark:bg-slate-950/80 rounded-2xl gap-1">
        <button
          onClick={() => setMobileTab("TABLES")}
          className={cn(
            "flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
            mobileTab === "TABLES"
              ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Quick Tables ({totalTables})</span>
        </button>

        <button
          onClick={() => setMobileTab("QUEUE")}
          className={cn(
            "flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
            mobileTab === "QUEUE"
              ? "bg-white text-indigo-600 dark:bg-slate-900 dark:text-indigo-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Queue ({queue.filter(q => q.status === "WAITING" || q.status === "CALLED").length})</span>
        </button>

        <button
          onClick={() => setMobileTab("FLOOR")}
          className={cn(
            "flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
            mobileTab === "FLOOR"
              ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <Armchair className="w-3.5 h-3.5" />
          <span>Floor Map</span>
        </button>
      </div>

      {/* MOBILE VIEW: QUICK TABLES (Screens < lg when active) */}
      <div className={cn("lg:hidden space-y-3", mobileTab === "TABLES" ? "block" : "hidden")}>
        {/* Filter Pills */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 space-y-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pb-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">Status:</span>
            {[
              { id: "ALL", label: `All (${totalTables})` },
              { id: "AVAILABLE", label: `Avail (${availableCount})` },
              { id: "OCCUPIED", label: `Occ (${occupiedCount})` },
              { id: "CLEANING", label: `Clean (${cleaningCount})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setMobileStatusFilter(f.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg shrink-0 transition-all",
                  mobileStatusFilter === f.id
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Section Filter */}
          {sections.length > 1 && (
            <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">Section:</span>
              <button
                onClick={() => setSelectedSection("ALL")}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded-lg shrink-0 transition-all",
                  selectedSection === "ALL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                All Sections
              </button>
              {sections.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSection(s)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-bold rounded-lg shrink-0 transition-all",
                    selectedSection === s
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  )}
                >
                  {s} ({tables.filter(t => (t.location || "Indoor") === s).length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Tables Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-8">
          {mobileFilteredTables.map(t => renderTableCard(t))}
        </div>
      </div>

      {/* MOBILE VIEW: LIVE QUEUE (Screens < lg when active) */}
      <div className={cn("lg:hidden space-y-3 pb-8", mobileTab === "QUEUE" ? "block" : "hidden")}>
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">Waiting Guests ({filteredQueue.length})</span>
            </div>
            <div className="flex space-x-1">
              {["ALL", "WAITING", "CALLED", "VIP"].map((f) => (
                <button
                  key={f}
                  onClick={() => setQueueFilter(f)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                    queueFilter === f
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-3 space-y-2.5">
            {filteredQueue.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No guests waiting in queue</p>
                <Button
                  onClick={() => setIsAddWalkInOpen(true)}
                  size="sm"
                  className="mt-3 bg-indigo-600 text-white rounded-xl text-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Walk-In Customer
                </Button>
              </div>
            ) : (
              filteredQueue.map(entry => renderQueueItem(entry))
            )}
          </CardContent>
        </Card>
      </div>

      {/* DESKTOP VIEW (Screens lg+) OR MOBILE FLOOR PLAN TAB */}
      <div className={cn(
        "grid-cols-1 lg:grid-cols-12 gap-3 items-start",
        mobileTab === "FLOOR" ? "grid" : "hidden lg:grid"
      )}>

        {/* LEFT COLUMN: LIVE QUEUE (Hidden on mobile when in floor mode) */}
        <div className="hidden lg:block lg:col-span-3 space-y-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
            
            {/* Header with Filter Pills */}
            <div className="p-2.5 px-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Queue ({filteredQueue.length})</span>
              </div>

              {/* Filter Pills */}
              <div className="flex space-x-1">
                {["ALL", "WAITING", "CALLED", "VIP"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setQueueFilter(f)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                      queueFilter === f
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Queue Cards */}
            <CardContent className="p-2 flex-1 overflow-y-auto space-y-2">
              {filteredQueue.length === 0 ? (
                <div className="text-center py-10 px-2 text-slate-400">
                  <Armchair className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Queue is empty</p>
                </div>
              ) : (
                filteredQueue.map((entry) => renderQueueItem(entry))
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: FLOOR PLAN CANVAS (12 cols on mobile, 9 cols on desktop) */}
        <div className="col-span-1 lg:col-span-9 space-y-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[calc(100vh-140px)] min-h-[500px] overflow-hidden">
            
            {/* Canvas Header & Section Pills */}
            <div className="p-2.5 px-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5">
                <Armchair className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Floor Layout</span>
              </div>

              {/* Section Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setSelectedSection("ALL")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                    selectedSection === "ALL"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  All ({totalTables})
                </button>
                {sections.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSection(s)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                      selectedSection === s
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    {s} ({tables.filter(t => (t.location || "Indoor") === s).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Floor Canvas */}
            <div className="p-3 flex-1 overflow-y-auto overflow-x-auto bg-slate-100/40 dark:bg-slate-950/20">
              
              {/* Unplaced Tables Fallback */}
              {unplacedTables.length > 0 && (
                <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1.5 block">
                    Additional Tables ({unplacedTables.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {unplacedTables.map(t => (
                      <div
                        key={t.id}
                        onClick={() => t.status === "AVAILABLE" ? setSelectedTableForAssign(t) : setSelectedTableForManage(t)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${getTableCardStyle(t.status, false)}`}
                      >
                        <span>{t.number}</span> • <span className="text-[10px]">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* COMPACT SPATIAL GRID */}
              <div 
                className="grid gap-2.5 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, minmax(120px, 1fr))`,
                  minWidth: `${gridCols * 125}px`
                }}
              >
                {Array.from({ length: gridRows }).map((_, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {Array.from({ length: gridCols }).map((_, colIndex) => {
                      const table = gridMatrix[rowIndex][colIndex];
                      const isHoveredTarget = dragOverTableId === table?.id;

                      if (!table) {
                        if (isEditMode) {
                          return (
                            <div
                              key={`empty-${rowIndex}-${colIndex}`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                const tableId = e.dataTransfer.getData("text/plain");
                                if (tableId) handleTableMove(tableId, rowIndex, colIndex);
                              }}
                              onClick={() => {
                                setNewTableGridPos({ row: rowIndex, col: colIndex });
                                setNewTableNumber(`T${tables.length + 1}`);
                                setIsAddTableOpen(true);
                              }}
                              className="h-28 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:bg-indigo-50/50 hover:border-indigo-400 flex flex-col items-center justify-center p-2 text-slate-400 transition-all cursor-pointer group"
                            >
                              <PlusCircle className="w-4 h-4 mb-0.5 group-hover:text-indigo-600" />
                              <span className="text-[10px] font-medium group-hover:text-indigo-600">Place Table</span>
                              <span className="text-[8px] opacity-40">({rowIndex},{colIndex})</span>
                            </div>
                          );
                        }
                        return (
                          <div 
                            key={`empty-${rowIndex}-${colIndex}`} 
                            className="h-28 rounded-xl border border-transparent opacity-10"
                          />
                        );
                      }

                      const matchesSection = selectedSection === "ALL" || (table.location || "Indoor") === selectedSection;
                      if (!matchesSection) {
                        return (
                          <div 
                            key={table.id} 
                            className="h-28 rounded-xl border border-dashed border-slate-200 opacity-20"
                          />
                        );
                      }

                      return renderTableCard(table, isHoveredTarget);
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL 1: ASSIGN / QUICK SEAT MODAL */}
      <Dialog open={!!selectedTableForAssign} onOpenChange={(open) => !open && setSelectedTableForAssign(null)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base">
              <Armchair className="w-4 h-4 text-emerald-600" />
              <span>Seat Guest at Table {selectedTableForAssign?.number}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Capacity: <strong>{selectedTableForAssign?.capacity} guests</strong> ({selectedTableForAssign?.location || "Indoor"})
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Label className="text-xs font-semibold">Select Customer from Queue:</Label>
            {filteredQueue.length === 0 ? (
              <div className="p-3 bg-slate-50 text-center rounded-lg border text-slate-500 text-xs">
                No customers currently in the queue.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {filteredQueue.map(q => (
                  <div
                    key={q.id}
                    onClick={() => {
                      if (selectedTableForAssign) {
                        handleAssignCustomerToTable(selectedTableForAssign.id, q.id);
                      }
                    }}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-slate-900">{q.tokenNumber}</span>
                        <span className="font-semibold text-xs text-slate-700">{q.customer.name || "Guest"}</span>
                        {q.priority === "PRIORITY" && <Badge className="bg-amber-500 text-[9px] px-1 py-0">VIP</Badge>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{q.customer.phone}</p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {q.guests} Pax
                      </span>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2">
                        Seat
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedTableForAssign(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: MANAGE OCCUPIED / CLEANING TABLE */}
      <Dialog open={!!selectedTableForManage} onOpenChange={(open) => !open && setSelectedTableForManage(null)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base">
              <Armchair className="w-4 h-4 text-slate-700" />
              <span>Table {selectedTableForManage?.number} Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Status: <strong>{selectedTableForManage?.status}</strong> • Capacity: {selectedTableForManage?.capacity} Pax
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            {selectedTableForManage?.status === "OCCUPIED" && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-rose-200/70 dark:border-rose-900/50">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Customer</span>
                    <p className="font-extrabold text-sm text-rose-950 dark:text-rose-200">
                      {selectedTableForManage.orders && selectedTableForManage.orders[0]?.customer?.name 
                        ? selectedTableForManage.orders[0].customer.name 
                        : "Walk-In Guest"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Live Bill</span>
                    <p className="font-extrabold text-sm text-rose-950 dark:text-rose-200 font-serif">
                      ₹{selectedTableForManage.orders && selectedTableForManage.orders[0] ? selectedTableForManage.orders[0].total : 0}
                    </p>
                  </div>
                </div>

                {/* List of Ordered Dishes */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    Ordered Dishes ({selectedTableForManage.orders && selectedTableForManage.orders[0]?.items ? selectedTableForManage.orders[0].items.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) : 0} items)
                  </span>

                  {selectedTableForManage.orders && selectedTableForManage.orders[0]?.items && selectedTableForManage.orders[0].items.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {selectedTableForManage.orders[0].items.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="flex items-center justify-between bg-white dark:bg-slate-900/80 p-1.5 px-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                          <div className="flex items-center space-x-1.5 flex-1 truncate">
                            <span className="bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-black text-[10px] px-1.5 py-0.5 rounded">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">
                              {item.menuItem?.name || item.name || "Dish Item"}
                            </span>
                            {item.specialInstructions && (
                              <span className="italic text-[10px] text-amber-600 dark:text-amber-400 truncate">
                                ({item.specialInstructions})
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-xs text-rose-700 dark:text-rose-300 font-serif shrink-0 ml-2">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-800/80 dark:text-rose-300 italic py-1">
                      Customer is seated • No dishes ordered yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase text-slate-500">Quick Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                {selectedTableForManage?.status === "OCCUPIED" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedTableForManage && handleUpdateTableStatus(selectedTableForManage.id, TableStatus.CLEANING)}
                      disabled={loadingAction}
                      className="border-amber-300 text-amber-900 hover:bg-amber-50 text-xs h-8"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Free & Clean
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedTableForManage && handleUpdateTableStatus(selectedTableForManage.id, TableStatus.AVAILABLE)}
                      disabled={loadingAction}
                      className="border-emerald-300 text-emerald-900 hover:bg-emerald-50 text-xs h-8"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Mark Available
                    </Button>
                  </>
                )}

                {selectedTableForManage?.status === "CLEANING" && (
                  <Button
                    size="sm"
                    onClick={() => selectedTableForManage && handleUpdateTableStatus(selectedTableForManage.id, TableStatus.AVAILABLE)}
                    disabled={loadingAction}
                    className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Clean & Ready for Guests
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setSelectedTableForManage(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ADD WALK-IN TO QUEUE */}
      <Dialog open={isAddWalkInOpen} onOpenChange={setIsAddWalkInOpen}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-base">
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Add Guest to Waiting Queue</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddWalkIn} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="walkInName">Customer Name</Label>
              <Input
                id="walkInName"
                placeholder="e.g. John Doe"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs" htmlFor="walkInPhone">Phone Number *</Label>
              <Input
                id="walkInPhone"
                placeholder="10-digit mobile number"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="walkInGuests">Guests (Pax) *</Label>
                <Input
                  id="walkInGuests"
                  type="number"
                  min="1"
                  max="30"
                  value={walkInGuests}
                  onChange={(e) => setWalkInGuests(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor="walkInPriority">Priority</Label>
                <Select value={walkInPriority} onValueChange={(val) => val && setWalkInPriority(val)}>
                  <SelectTrigger id="walkInPriority" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="PRIORITY">VIP / Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs" htmlFor="walkInPref">Preference (Optional)</Label>
              <Input
                id="walkInPref"
                placeholder="e.g. Indoor, Window"
                value={walkInPreference}
                onChange={(e) => setWalkInPreference(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddWalkInOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                {loadingAction ? "Generating..." : "Issue Token"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: ADD NEW TABLE */}
      <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Add New Table</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateNewTable} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="tableNum">Table Label *</Label>
              <Input
                id="tableNum"
                placeholder="e.g. 16, T-5"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs" htmlFor="tableCap">Capacity *</Label>
                <Input
                  id="tableCap"
                  type="number"
                  min="1"
                  max="30"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs" htmlFor="tableLoc">Section</Label>
                <Select value={newTableLocation} onValueChange={(val) => val && setNewTableLocation(val)}>
                  <SelectTrigger id="tableLoc" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indoor">Indoor</SelectItem>
                    <SelectItem value="Terrace">Terrace</SelectItem>
                    <SelectItem value="Private Dining">Private Dining</SelectItem>
                    <SelectItem value="Bar">Bar</SelectItem>
                    <SelectItem value="Outdoor">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddTableOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={loadingAction} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                Create Table
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: EDIT TABLE */}
      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent className="w-[94vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Configure Table {editingTable?.number}</DialogTitle>
          </DialogHeader>

          {editingTable && (
            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Label className="text-xs">Table Number</Label>
                <Input
                  value={editingTable.number}
                  onChange={(e) => setEditingTable({ ...editingTable, number: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Capacity</Label>
                  <Input
                    type="number"
                    value={editingTable.capacity}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) || 1 })}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Section</Label>
                  <Input
                    value={editingTable.location || "Indoor"}
                    onChange={(e) => setEditingTable({ ...editingTable, location: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between items-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTable(editingTable.id)}
                  className="h-7 text-xs px-2"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>

                <div className="space-x-1.5">
                  <Button variant="outline" size="sm" onClick={() => setEditingTable(null)} className="h-7 text-xs">Cancel</Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 text-white h-7 text-xs"
                    onClick={async () => {
                      try {
                        await fetch(`/api/tables/${editingTable.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            number: editingTable.number,
                            capacity: editingTable.capacity,
                            location: editingTable.location
                          })
                        });
                        setTables(prev => prev.map(t => t.id === editingTable.id ? editingTable : t));
                        setEditingTable(null);
                        toast({ title: "Updated" });
                      } catch (err) {
                        toast({ variant: "destructive", title: "Failed" });
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
