"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Bell, BellRing, Check, CheckCheck, Droplets, 
  ReceiptText, Sparkles, UserCheck, X, Volume2, VolumeX 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

export type ServiceRequestItem = {
  id: string;
  restaurantId: string;
  tableId: string;
  type: "CALL_WAITER" | "WATER" | "CLEANING" | "REQUEST_BILL" | "OTHER";
  status: "PENDING" | "ACKNOWLEDGED" | "RESOLVED";
  notes?: string | null;
  createdAt: string;
  table: {
    id: string;
    number: string;
    location?: string | null;
  };
};

export function ServiceRequestBell() {
  const [requests, setRequests] = useState<ServiceRequestItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevCountRef = useRef(0);
  const { toast } = useToast();

  const playNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio context might be restricted before first interaction
    }
  };

  const fetchRequests = useCallback(async () => {
    // Only fetch if window is visible and online
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    try {
      const res = await fetch("/api/service-requests", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const newRequests: ServiceRequestItem[] = json.data;
        
        // If new pending request came in, play chime and notify
        if (newRequests.length > prevCountRef.current && prevCountRef.current !== 0) {
          const newest = newRequests[newRequests.length - 1];
          playNotificationSound();
          toast({
            title: `🛎️ Table ${newest.table?.number || "Guest"}: ${getTypeLabel(newest.type)}`,
            description: "A guest is requesting assistance.",
          });
        }
        prevCountRef.current = newRequests.length;
        setRequests(newRequests);
      }
    } catch (err) {
      // Ignore transient network errors during hot reload or page navigation
    }
  }, [soundEnabled, toast]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const pollLoop = async () => {
      if (!isMounted) return;
      await fetchRequests();
      if (isMounted) {
        timeoutId = setTimeout(pollLoop, 6000);
      }
    };

    pollLoop();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchRequests]);

  const handleUpdateStatus = async (id: string, status: "ACKNOWLEDGED" | "RESOLVED") => {
    try {
      const res = await fetch(`/api/service-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        if (status === "RESOLVED") {
          setRequests((prev) => prev.filter((r) => r.id !== id));
          toast({ title: "Request resolved" });
        } else {
          setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: "ACKNOWLEDGED" } : r))
          );
          toast({ title: "Request acknowledged" });
        }
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to update request" });
    }
  };

  const getTypeIcon = (type: ServiceRequestItem["type"]) => {
    switch (type) {
      case "WATER":
        return <Droplets className="w-3.5 h-3.5 text-blue-500" />;
      case "REQUEST_BILL":
        return <ReceiptText className="w-3.5 h-3.5 text-emerald-500" />;
      case "CLEANING":
        return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: ServiceRequestItem["type"]) => {
    switch (type) {
      case "WATER":
        return "Need Water";
      case "REQUEST_BILL":
        return "Request Bill";
      case "CLEANING":
        return "Clean Table";
      default:
        return "Call Waiter";
    }
  };

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
        aria-label="Table Service Requests"
        title="Table Service Requests"
      >
        {pendingCount > 0 ? (
          <BellRing className="w-5 h-5 text-amber-500 animate-bounce" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {requests.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-xs animate-pulse">
            {requests.length}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-[90vw] max-w-sm sm:w-84 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 px-4 bg-slate-50/80 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  Table Service Requests
                </span>
                {requests.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                    {requests.length} active
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title={soundEnabled ? "Mute sound" : "Enable sound"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of Requests */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1.5">
              {requests.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCheck className="w-8 h-8 mx-auto mb-1 opacity-40 text-emerald-500" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">All caught up!</p>
                  <p className="text-[10px] text-slate-400">No pending table service calls.</p>
                </div>
              ) : (
                requests.map((req) => {
                  const isPending = req.status === "PENDING";
                  return (
                    <div
                      key={req.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isPending
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40"
                          : "bg-slate-50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                            T{req.table?.number}
                          </span>
                          <div>
                            <div className="flex items-center space-x-1 font-bold text-xs text-slate-800 dark:text-slate-200">
                              {getTypeIcon(req.type)}
                              <span>{getTypeLabel(req.type)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block">
                              {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPending ? (
                            <Badge className="bg-amber-500 text-[9px] py-0 px-1 animate-pulse">
                              NEW
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 text-blue-600 border-blue-300">
                              ATTENDING
                            </Badge>
                          )}
                        </div>
                      </div>

                      {req.notes && (
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 italic bg-white/60 dark:bg-slate-800/60 p-1 rounded">
                          "{req.notes}"
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end space-x-1.5">
                        {isPending && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(req.id, "ACKNOWLEDGED")}
                            className="h-6 text-[10px] px-2 rounded-lg"
                          >
                            Attending
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(req.id, "RESOLVED")}
                          className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                        >
                          <Check className="w-3 h-3 mr-0.5" /> Done
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
