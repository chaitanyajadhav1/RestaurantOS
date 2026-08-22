"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

type QueueEntry = {
  id: string;
  tokenNumber: string;
  status: string;
  priority: string;
};

export function DisplayQueueClient({ restaurantId }: { restaurantId: string }) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        // We need a public endpoint or a token to fetch this. 
        // For MVP, if it's public, we'll fetch from a new display API or we can just bypass auth for GET /api/display/queue?restaurantId
        // Wait, /api/queue GET requires session. We should create a public display endpoint or modify it.
        // Actually, let's use the new endpoint /api/display/queue we'll create right after this.
        const res = await fetch(`/api/display/queue?restaurantId=${restaurantId}`);
        const json = await res.json();
        if (json.success) {
          setQueue(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch display queue");
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // 5s polling
    return () => clearInterval(interval);
  }, [restaurantId]);

  const serving = queue.filter(q => q.status === 'CALLED');
  const waiting = queue.filter(q => q.status === 'WAITING').slice(0, 10); // Show max 10 next

  return (
    <div className="w-full flex h-full">
      {/* NOW SERVING (Left Side) */}
      <div className="w-1/2 bg-slate-900 border-r border-slate-800 p-8 flex flex-col items-center">
        <h2 className="text-4xl font-bold text-green-400 mb-12 tracking-widest uppercase">Now Serving</h2>
        
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full">
          {serving.length > 0 ? (
            serving.map((entry, idx) => (
              <div 
                key={entry.id} 
                className={`bg-slate-800 rounded-3xl w-full max-w-md flex flex-col items-center justify-center shadow-2xl border-2 ${idx === 0 ? 'border-green-500 py-16' : 'border-slate-700 py-8 opacity-80'}`}
              >
                <div className="flex items-center space-x-4">
                  <span className={`${idx === 0 ? 'text-8xl' : 'text-6xl'} font-black text-white tracking-tighter`}>
                    {entry.tokenNumber}
                  </span>
                  {entry.priority === 'PRIORITY' && (
                    <Badge variant="destructive" className="text-xl px-3 py-1">VIP</Badge>
                  )}
                </div>
                {idx === 0 && <div className="mt-4 text-green-400 text-xl font-medium animate-pulse">Please proceed to counter</div>}
              </div>
            ))
          ) : (
            <div className="text-3xl text-slate-600 font-medium">No tokens called yet</div>
          )}
        </div>
      </div>

      {/* NEXT (Right Side) */}
      <div className="w-1/2 bg-slate-950 p-8 flex flex-col items-center">
        <h2 className="text-4xl font-bold text-slate-400 mb-12 tracking-widest uppercase">Next in Queue</h2>
        
        <div className="w-full max-w-md space-y-4">
          {waiting.length > 0 ? (
            waiting.map((entry) => (
              <div key={entry.id} className="bg-slate-900 rounded-2xl p-6 flex justify-between items-center border border-slate-800">
                <span className="text-5xl font-bold text-slate-300">{entry.tokenNumber}</span>
                {entry.priority === 'PRIORITY' && (
                  <Badge variant="secondary" className="text-lg bg-slate-800 text-slate-300">VIP</Badge>
                )}
              </div>
            ))
          ) : (
            <div className="text-2xl text-slate-700 font-medium text-center mt-12">No waiting tokens</div>
          )}
        </div>
      </div>
    </div>
  );
}
