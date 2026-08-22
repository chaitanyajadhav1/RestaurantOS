"use client";

import { useState, useEffect } from "react";
import { Loader2, Users, Clock, ArrowRight, Utensils, CheckCircle2, Ticket } from "lucide-react";
import { toast } from "sonner";

type StatusData = {
  state: "NONE" | "WAITING" | "CALLED" | "SEATED";
  queue: {
    id: string;
    tokenNumber: string;
    status: string;
    position: number;
    estimatedWaitMins: number;
  } | null;
  table: {
    tableNumber: string;
    orderStatus: string;
  } | null;
};

export function CustomerDashboardWidget() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Join Queue State
  const [isJoining, setIsJoining] = useState(false);
  const [guests, setGuests] = useState(2);
  const [showJoinForm, setShowJoinForm] = useState(false);

  // Poll status every 5 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/customer/status");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    try {
      const res = await fetch("/api/customer/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests }),
      });
      const json = await res.json();
      
      if (!res.ok) {
        toast.error(json.error || "Failed to join queue");
      } else {
        toast.success("Successfully joined the waitlist!");
        setShowJoinForm(false);
        fetchStatus();
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800/50 rounded-3xl p-8 flex justify-center items-center mb-12 shadow-sm">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) return null;

  // 1. SEATED STATE
  if (data.state === "SEATED" && data.table) {
    return (
      <div className="w-full bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white mb-12 shadow-xl shadow-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20">
          <Utensils className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold tracking-widest uppercase mb-3">
              <CheckCircle2 className="w-4 h-4" /> You are seated
            </div>
            <h2 className="text-4xl font-black mb-1">Table {data.table.tableNumber}</h2>
            <p className="text-emerald-100 font-medium">Browse the menu below and enjoy your meal!</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Order Status</p>
            <p className="font-bold text-lg">{data.table.orderStatus.replace("_", " ")}</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. CALLED STATE
  if (data.state === "CALLED" && data.queue) {
    return (
      <div className="w-full bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 sm:p-8 text-white mb-12 shadow-xl shadow-amber-500/20 animate-pulse">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold tracking-widest uppercase mb-3">
              <Ticket className="w-4 h-4" /> It's your turn!
            </div>
            <h2 className="text-3xl font-black mb-1">Please proceed to the host desk</h2>
            <p className="text-amber-100">Show them your token number to be seated.</p>
          </div>
          <div className="bg-white text-orange-600 px-8 py-6 rounded-2xl shadow-lg shrink-0 w-full sm:w-auto">
            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-orange-400">Token Number</p>
            <p className="text-4xl font-black">{data.queue.tokenNumber}</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. WAITING STATE
  if (data.state === "WAITING" && data.queue) {
    return (
      <div className="w-full bg-white dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 mb-12 shadow-md dark:shadow-none">
        <div className="flex items-center gap-2 mb-6 text-amber-600 dark:text-amber-500 font-bold uppercase tracking-widest text-sm">
          <Clock className="w-4 h-4" /> You are in the Queue
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-stone-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-stone-100 dark:border-zinc-800/50">
            <p className="text-xs text-stone-500 dark:text-zinc-500 font-bold uppercase mb-1">Token</p>
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">{data.queue.tokenNumber}</p>
          </div>
          <div className="bg-stone-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-stone-100 dark:border-zinc-800/50">
            <p className="text-xs text-stone-500 dark:text-zinc-500 font-bold uppercase mb-1">Position in line</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-500">#{data.queue.position}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-stone-50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-stone-100 dark:border-zinc-800/50">
            <p className="text-xs text-stone-500 dark:text-zinc-500 font-bold uppercase mb-1">Est. Wait</p>
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100">~{data.queue.estimatedWaitMins}m</p>
          </div>
        </div>
      </div>
    );
  }

  // 4. NONE STATE (Join Queue)
  return (
    <div className="w-full bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-6 sm:p-10 text-white mb-12 shadow-xl relative overflow-hidden">
      {/* Decorative bg */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500 rounded-full blur-[80px] opacity-20"></div>
      
      {!showJoinForm ? (
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-serif text-amber-400 mb-2">Join the Waitlist</h2>
            <p className="text-zinc-400 max-w-sm">Secure your spot in line before arriving or while waiting in the lobby.</p>
          </div>
          <button 
            onClick={() => setShowJoinForm(true)}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 group shrink-0 shadow-lg shadow-amber-500/20 active:scale-95"
          >
            Get in line <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="relative z-10">
          <h2 className="text-2xl font-serif text-amber-400 mb-6">How many guests?</h2>
          <form onSubmit={handleJoinQueue} className="flex flex-col sm:flex-row items-stretch gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Users className="h-5 w-5 text-zinc-400" />
              </div>
              <input 
                type="number" min="1" max="20" required
                value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full pl-12 pr-4 py-4 bg-zinc-950/50 border border-zinc-700 rounded-2xl text-white text-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button 
                type="button" onClick={() => setShowJoinForm(false)}
                className="px-6 py-4 rounded-2xl font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all border border-transparent"
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={isJoining}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 min-w-[140px]"
              >
                {isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
