"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Clock, ChefHat, CheckCircle2, Play, Utensils, 
  Sparkles, RefreshCw, Bell, Search, AlertCircle, Check, 
  ArrowRight, Layers, Volume2, VolumeX, Package, BellRing, Settings2, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type OrderItem = {
  id: string;
  quantity: number;
  specialInstructions: string | null;
  menuItem: { 
    name: string;
    type?: string;
  };
};

type Order = {
  id: string;
  status: string;
  type: string;
  partyLabel?: string | null;
  guestCount?: number | null;
  groupName?: string | null;
  createdAt: string;
  table?: { number: string; location?: string | null } | null;
  customer?: { name: string | null; phone?: string } | null;
  items: OrderItem[];
};

// Play pleasant web audio double-tone chime before speaking
function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(587.33, 0, 0.18); // D5
    playTone(880.00, 0.15, 0.35); // A5
  } catch {
    // AudioContext blocked or unsupported
  }
}

export function KitchenKdsClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [searchTable, setSearchTable] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"ALL" | "DINE_IN" | "TAKEAWAY">("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"NEW" | "PREPARING" | "READY" | "ALL">("NEW");
  
  // Voice Assistant States
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState<"mr" | "hi" | "en">("mr"); // Default to Marathi
  const [isReminderEnabled, setIsReminderEnabled] = useState(true);
  const announcedOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const lastReminderTimeRef = useRef<number>(Date.now());
  const { toast } = useToast();

  // Load language preference from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("kds_voice_language");
      if (savedLang === "mr" || savedLang === "hi" || savedLang === "en") {
        setVoiceLanguage(savedLang);
      }
    } catch {}
  }, []);

  const handleLanguageChange = (lang: "mr" | "hi" | "en") => {
    setVoiceLanguage(lang);
    try {
      localStorage.setItem("kds_voice_language", lang);
    } catch {}

    const messages = {
      mr: "व्हॉइस भाषा मराठी निवडली आहे",
      hi: "वॉइस भाषा हिंदी चुनी गई है",
      en: "Voice language set to English",
    };
    toast({ title: `🗣️ ${messages[lang]}` });
    speakCustomText(
      lang === "mr"
        ? "मराठी व्हॉइस असिस्टंट सक्रिय केले आहे!"
        : lang === "hi"
        ? "हिंदी वॉइस असिस्टेंट सक्रिय किया गया है!"
        : "English voice assistant activated!",
      lang
    );
  };

  // Text-To-Speech Speaker function with Marathi / Hindi / English support
  const speakCustomText = useCallback((text: string, lang: "mr" | "hi" | "en" = voiceLanguage) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      playKitchenChime();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // slightly slower for maximum clarity in a noisy kitchen
        utterance.pitch = 1.05;

        const voices = window.speechSynthesis.getVoices();

        if (lang === "mr") {
          utterance.lang = "mr-IN";
          const marathiVoice = voices.find(v => 
            v.lang.startsWith("mr") || 
            v.name.toLowerCase().includes("marathi") || 
            v.lang.startsWith("hi") || 
            v.name.toLowerCase().includes("hindi") ||
            v.lang.includes("IN")
          );
          if (marathiVoice) utterance.voice = marathiVoice;
        } else if (lang === "hi") {
          utterance.lang = "hi-IN";
          const hindiVoice = voices.find(v => 
            v.lang.startsWith("hi") || 
            v.name.toLowerCase().includes("hindi") ||
            v.lang.includes("IN")
          );
          if (hindiVoice) utterance.voice = hindiVoice;
        } else {
          utterance.lang = "en-IN";
          const englishVoice = voices.find(v => 
            (v.lang.startsWith("en") || v.lang.includes("IN")) && 
            (v.name.includes("India") || v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))
          );
          if (englishVoice) utterance.voice = englishVoice;
        }
        
        window.speechSynthesis.speak(utterance);
      }, 350);
    } catch (err) {
      console.error("Speech synthesis error:", err);
    }
  }, [voiceLanguage]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const active = json.data.filter((o: Order) => 
          ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
        );
        
        // Check for Brand New Orders to Announce
        if (isVoiceEnabled) {
          const newIncomingOrders = active.filter(
            (o: Order) => !announcedOrderIdsRef.current.has(o.id) && (o.status === "PLACED" || o.status === "CONFIRMED")
          );

          if (newIncomingOrders.length > 0) {
            newIncomingOrders.forEach((o: Order) => {
              announcedOrderIdsRef.current.add(o.id);
              
              // Build spoken summary based on language
              const itemsList = o.items.map((i: OrderItem) => `${i.quantity} ${i.menuItem?.name || "item"}`).join(", ");
              const isParcel = o.type === "TAKEAWAY";
              const tokenOrName = o.groupName || o.customer?.name || "पार्सल";
              const tableNum = o.table?.number || "";

              let announcement = "";

              if (voiceLanguage === "mr") {
                // MARATHI
                if (isParcel) {
                  announcement = `नवीन पार्सल ऑर्डर! टोकन ${tokenOrName}. ऑर्डर्स: ${itemsList}`;
                } else {
                  announcement = `नवीन ऑर्डर! टेबल नंबर ${tableNum} साठी. ऑर्डर्स: ${itemsList}`;
                }
              } else if (voiceLanguage === "hi") {
                // HINDI
                if (isParcel) {
                  announcement = `नया पार्सल आर्डर आया है! ${tokenOrName}. आइटम्स: ${itemsList}`;
                } else {
                  announcement = `नया आर्डर! टेबल नंबर ${tableNum} के लिए. आइटम्स: ${itemsList}`;
                }
              } else {
                // ENGLISH
                if (isParcel) {
                  announcement = `New Parcel Order received! ${tokenOrName}. Items: ${itemsList}`;
                } else {
                  const tableInfo = o.table ? `Table ${o.table.number}` : "Dine In";
                  const partyInfo = o.partyLabel ? `, Group ${o.partyLabel}` : "";
                  announcement = `New Order received for ${tableInfo}${partyInfo}. Items: ${itemsList}`;
                }
              }

              speakCustomText(announcement);
            });
          }
        }

        setOrders(active);
      }
    } catch (err) {
      console.error("Failed to fetch KDS orders");
    } finally {
      setIsRefreshing(false);
    }
  }, [isVoiceEnabled, voiceLanguage, speakCustomText]);

  // Periodic polling for kitchen orders (every 3 seconds)
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // 5-Minute Periodic Voice Reminder & Briefing
  useEffect(() => {
    if (!isVoiceEnabled || !isReminderEnabled) return;

    const reminderInterval = setInterval(() => {
      const now = Date.now();
      // Check if 5 minutes elapsed (300,000 ms)
      if (now - lastReminderTimeRef.current >= 300000) {
        lastReminderTimeRef.current = now;

        const activeTickets = orders.filter(o => o.status !== "READY" && o.status !== "COMPLETED");
        if (activeTickets.length === 0) return;

        const parcelCount = activeTickets.filter(o => o.type === "TAKEAWAY").length;
        const tableCount = activeTickets.length - parcelCount;

        // Check for delayed orders (> 8 minutes)
        const delayedOrders = activeTickets.filter(o => {
          const diffMins = (now - new Date(o.createdAt).getTime()) / 60000;
          return diffMins >= 8;
        });

        let briefingText = "";

        if (voiceLanguage === "mr") {
          // MARATHI BRIEFING
          briefingText = `किचन अपडेट: सध्या ${activeTickets.length} ऑर्डर्स चालू आहेत. `;
          if (parcelCount > 0) briefingText += `${parcelCount} पार्सल, `;
          if (tableCount > 0) briefingText += `${tableCount} टेबल ऑर्डर्स. `;

          if (delayedOrders.length > 0) {
            const firstDelayed = delayedOrders[0];
            const waitMins = Math.floor((now - new Date(firstDelayed.createdAt).getTime()) / 60000);
            const target = firstDelayed.type === "TAKEAWAY" 
              ? (firstDelayed.groupName || "पार्सल") 
              : `टेबल ${firstDelayed.table?.number || ""}`;
            briefingText += `कृपया लक्ष द्या: ${target} ची ऑर्डर ${waitMins} मिनिटांपासून पेंडिंग आहे.`;
          }
        } else if (voiceLanguage === "hi") {
          // HINDI BRIEFING
          briefingText = `किचन अपडेट: कुल ${activeTickets.length} आर्डर्स चालू हैं। `;
          if (parcelCount > 0) briefingText += `${parcelCount} पार्सल, `;
          if (tableCount > 0) briefingText += `${tableCount} टेबल आर्डर्स। `;

          if (delayedOrders.length > 0) {
            const firstDelayed = delayedOrders[0];
            const waitMins = Math.floor((now - new Date(firstDelayed.createdAt).getTime()) / 60000);
            const target = firstDelayed.type === "TAKEAWAY" 
              ? (firstDelayed.groupName || "पार्सल") 
              : `टेबल ${firstDelayed.table?.number || ""}`;
            briefingText += `ध्यान दें: ${target} का आर्डर ${waitMins} मिनट से पेंडिंग है।`;
          }
        } else {
          // ENGLISH BRIEFING
          briefingText = `Kitchen reminder. You have ${activeTickets.length} active tickets. `;
          if (parcelCount > 0) briefingText += `${parcelCount} parcel orders, `;
          if (tableCount > 0) briefingText += `${tableCount} table orders. `;

          if (delayedOrders.length > 0) {
            const firstDelayed = delayedOrders[0];
            const waitMins = Math.floor((now - new Date(firstDelayed.createdAt).getTime()) / 60000);
            const target = firstDelayed.type === "TAKEAWAY" 
              ? (firstDelayed.groupName || "Parcel") 
              : `Table ${firstDelayed.table?.number || ""}`;
            briefingText += `Attention: ${target} has been waiting for ${waitMins} minutes.`;
          }
        }

        speakCustomText(briefingText);
      }
    }, 15000); // check condition every 15s

    return () => clearInterval(reminderInterval);
  }, [isVoiceEnabled, isReminderEnabled, orders, voiceLanguage, speakCustomText]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: `Ticket updated to ${status.replace('_', ' ')}` });
        fetchOrders();
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
    }
  };

  const handleTestVoice = () => {
    let testMsg = "Kitchen Voice Assistant is online and ready for incoming orders!";
    if (voiceLanguage === "mr") {
      testMsg = "नमस्कार! किचन व्हॉइस असिस्टंट सुरू आहे आणि नवीन ऑर्डर्स सांगण्यासाठी तयार आहे!";
    } else if (voiceLanguage === "hi") {
      testMsg = "नमस्ते! किचन वॉइस असिस्टेंट चालू है और नए ऑर्डर्स के लिए तैयार है!";
    }
    speakCustomText(testMsg);
    toast({ title: `🔊 Playing Voice Test in ${voiceLanguage === "mr" ? "मराठी (Marathi)" : voiceLanguage === "hi" ? "हिंदी (Hindi)" : "English"}...` });
  };

  // Filter orders by search & type
  const filteredOrders = orders.filter(o => {
    // Type Filter
    if (orderTypeFilter === "DINE_IN" && o.type === "TAKEAWAY") return false;
    if (orderTypeFilter === "TAKEAWAY" && o.type !== "TAKEAWAY") return false;

    // Search Filter
    if (!searchTable.trim()) return true;
    const q = searchTable.toLowerCase();
    const tableMatch = o.table?.number.toLowerCase().includes(q);
    const tokenMatch = o.groupName?.toLowerCase().includes(q);
    const itemMatch = o.items?.some(i => i.menuItem?.name?.toLowerCase().includes(q));
    const customerMatch = o.customer?.name?.toLowerCase().includes(q);
    return tableMatch || tokenMatch || itemMatch || customerMatch;
  });

  const newOrders = filteredOrders.filter(o => o.status === 'PLACED' || o.status === 'CONFIRMED');
  const preparingOrders = filteredOrders.filter(o => o.status === 'PREPARING');
  const readyOrders = filteredOrders.filter(o => o.status === 'READY');

  const dineInCount = orders.filter(o => o.type !== "TAKEAWAY").length;
  const takeawayCount = orders.filter(o => o.type === "TAKEAWAY").length;

  const getElapsedTime = (createdAt: string) => {
    const diffMins = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins > 60) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    return `${diffMins}m ago`;
  };

  const isOrderFresh = (createdAt: string) => {
    const diffMins = (new Date().getTime() - new Date(createdAt).getTime()) / 60000;
    return diffMins < 5;
  };

  const renderOrderCardActions = (order: Order) => {
    const isParcel = order.type === "TAKEAWAY";

    if (order.status === 'PLACED' || order.status === 'CONFIRMED') {
      return (
        <Button
          onClick={() => updateStatus(order.id, 'PREPARING')}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold h-11 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 text-sm"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{isParcel ? "Start Cooking Parcel 📦👨‍🍳" : "Start Cooking 👨‍🍳"}</span>
        </Button>
      );
    }
    if (order.status === 'PREPARING') {
      return (
        <Button
          onClick={() => updateStatus(order.id, 'READY')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold h-11 rounded-xl shadow-xs flex items-center justify-center space-x-1.5 text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isParcel ? "Mark Parcel Ready for Packing 📦🛎️" : "Mark Ready to Serve 🛎️"}</span>
        </Button>
      );
    }
    if (order.status === 'READY') {
      return (
        <Button
          onClick={() => updateStatus(order.id, 'COMPLETED')}
          variant="outline"
          className="w-full border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 active:scale-98 font-bold h-11 rounded-xl flex items-center justify-center space-x-1.5 text-xs sm:text-sm"
        >
          <Check className="w-4 h-4" />
          <span>{isParcel ? "Mark Handed Over / Packed ✅" : "Mark Served to Table"}</span>
        </Button>
      );
    }
    return null;
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const elapsed = getElapsedTime(order.createdAt);
    const fresh = isOrderFresh(order.createdAt);
    const isNew = order.status === 'PLACED' || order.status === 'CONFIRMED';
    const isCooking = order.status === 'PREPARING';
    const isReady = order.status === 'READY';
    const isParcel = order.type === 'TAKEAWAY';

    return (
      <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all ${
        fresh && isNew
          ? "border-emerald-500 ring-2 ring-emerald-400/40 bg-emerald-50/20 dark:bg-slate-900/95"
          : isCooking
          ? "border-blue-200 dark:border-blue-900/40"
          : isReady
          ? "border-emerald-200 dark:border-emerald-900/40"
          : "border-slate-200 dark:border-slate-800"
      }`}>
        {/* Card Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              {isParcel ? (
                <div className="flex items-center gap-1.5">
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                    <Package className="w-3.5 h-3.5" /> PARCEL
                  </span>
                  <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {order.groupName || "Takeaway"}
                  </span>
                </div>
              ) : (
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center">
                  {order.table ? `Table ${order.table.number}` : 'Dine-In'}
                  {order.partyLabel && (
                    <span className="ml-1.5 text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Group {order.partyLabel}
                    </span>
                  )}
                </span>
              )}

              {fresh && isNew && (
                <span className="bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse uppercase">
                  NEW!
                </span>
              )}
              {isCooking && (
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  Cooking
                </span>
              )}
              {isReady && (
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  Ready
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              <span>#{order.id.slice(-6).toUpperCase()}</span>
              {order.table?.location && <span>• {order.table.location}</span>}
              {order.customer?.name && <span>• {order.customer.name}</span>}
              {order.guestCount && <span>• {order.guestCount} Pax</span>}
            </div>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-500 mr-1" />
            <span>{elapsed}</span>
          </div>
        </div>

        {/* Dish Items List */}
        <div className="py-3.5 space-y-2.5 flex-1">
          {(!order.items || order.items.length === 0) ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
              Order placed • Waiting for kitchen preparation...
            </p>
          ) : (
            order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between text-sm">
                <div className="flex items-start space-x-2 flex-1">
                  <span className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50 shrink-0 mt-0.5">
                    {item.quantity}x
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight block">
                      {item.menuItem?.name || "Dish Item"}
                    </span>
                    {item.specialInstructions && (
                      <p className={cn(
                        "text-xs rounded px-2 py-1 mt-1 font-semibold",
                        item.specialInstructions.includes("ADD-ON")
                          ? "bg-amber-500 text-slate-950 font-black shadow-xs flex items-center gap-1"
                          : item.specialInstructions.includes("PARCEL")
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300"
                          : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 italic"
                      )}>
                        {item.specialInstructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          {renderOrderCardActions(order)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* KDS TOP CONTROL BAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 px-4 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        
        {/* Left: Summary Metrics with horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-xs shrink-0">
            <ChefHat className="w-4 h-4 text-amber-500" />
            <span>Active: {orders.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>New: {newOrders.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Cooking: {preparingOrders.length}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ready: {readyOrders.length}</span>
          </div>
        </div>

        {/* Center: Dine-in vs Parcel Filter Pills */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setOrderTypeFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              orderTypeFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            All ({orders.length})
          </button>
          <button
            onClick={() => setOrderTypeFilter("DINE_IN")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              orderTypeFilter === "DINE_IN"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Utensils className="w-3.5 h-3.5 text-indigo-500" />
            <span>Dine-In ({dineInCount})</span>
          </button>
          <button
            onClick={() => setOrderTypeFilter("TAKEAWAY")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1",
              orderTypeFilter === "TAKEAWAY"
                ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Parcels ({takeawayCount})</span>
          </button>
        </div>

        {/* Right: AI Voice Controls, Language Selector, Search & Sync */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector (Marathi, Hindi, English) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-0.5 shrink-0 border border-slate-200/80 dark:border-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            <button
              onClick={() => handleLanguageChange("mr")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold transition-all",
                voiceLanguage === "mr"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              मराठी
            </button>
            <button
              onClick={() => handleLanguageChange("hi")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold transition-all",
                voiceLanguage === "hi"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              हिंदी
            </button>
            <button
              onClick={() => handleLanguageChange("en")}
              className={cn(
                "px-2 py-1 rounded-lg text-[11px] font-bold transition-all",
                voiceLanguage === "en"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              EN
            </button>
          </div>

          {/* AI Voice Toggle Button */}
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              size="sm"
              variant={isVoiceEnabled ? "default" : "outline"}
              className={cn(
                "h-9 text-xs rounded-xl font-bold px-2.5 transition-all",
                isVoiceEnabled
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "text-slate-500"
              )}
              title={isVoiceEnabled ? "Voice Assistant Active (Speaks new orders & 5-min briefing)" : "Voice Assistant Muted"}
            >
              {isVoiceEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-emerald-300 animate-pulse" />
                  Voice: ON
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 mr-1" />
                  Voice: OFF
                </>
              )}
            </Button>

            {isVoiceEnabled && (
              <Button
                onClick={handleTestVoice}
                size="sm"
                variant="ghost"
                className="h-9 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 rounded-xl font-bold"
                title="Test Audio Chime & Speech Output"
              >
                Test
              </Button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-40">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search table / parcel..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="h-9 text-xs pl-8 w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl"
            />
          </div>

          {/* Sync */}
          <Button
            onClick={() => {
              setIsRefreshing(true);
              fetchOrders();
            }}
            size="sm"
            variant="outline"
            className="h-9 text-xs border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 px-2.5 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* MOBILE STAGE TABS (Visible only on screens < md) */}
      <div className="md:hidden flex p-1 bg-slate-200/70 dark:bg-slate-950/80 rounded-2xl gap-1">
        <button
          onClick={() => setActiveMobileTab("NEW")}
          className={cn(
            "flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
            activeMobileTab === "NEW"
              ? "bg-white text-rose-600 dark:bg-slate-900 dark:text-rose-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>New ({newOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveMobileTab("PREPARING")}
          className={cn(
            "flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
            activeMobileTab === "PREPARING"
              ? "bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Cooking ({preparingOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveMobileTab("READY")}
          className={cn(
            "flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-black transition-all",
            activeMobileTab === "READY"
              ? "bg-white text-emerald-600 dark:bg-slate-900 dark:text-emerald-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Ready ({readyOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveMobileTab("ALL")}
          className={cn(
            "px-3 flex items-center justify-center space-x-1 py-2.5 rounded-xl text-xs font-bold transition-all",
            activeMobileTab === "ALL"
              ? "bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All ({filteredOrders.length})</span>
        </button>
      </div>

      {/* MOBILE SINGLE STAGE FEED (Screens < md) */}
      <div className="md:hidden space-y-3 pb-8">
        {activeMobileTab === "NEW" && (
          newOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30 text-rose-500" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No new incoming orders</p>
              <p className="text-xs text-slate-400 mt-1">Orders placed will pop up here with voice announcement</p>
            </div>
          ) : (
            newOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}

        {activeMobileTab === "PREPARING" && (
          preparingOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <ChefHat className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-500" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No food currently cooking</p>
              <p className="text-xs text-slate-400 mt-1">Tap &apos;Start Cooking&apos; on a new order</p>
            </div>
          ) : (
            preparingOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}

        {activeMobileTab === "READY" && (
          readyOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No orders awaiting pickup</p>
              <p className="text-xs text-slate-400 mt-1">Dishes marked ready will appear here for staff</p>
            </div>
          ) : (
            readyOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}

        {activeMobileTab === "ALL" && (
          filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
              <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No active orders</p>
            </div>
          ) : (
            filteredOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}
      </div>

      {/* DESKTOP 3-COLUMN KANBAN WORKSPACE (Screens md+) */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 h-[calc(100vh-140px)] min-h-[550px]">
        
        {/* COLUMN 1: NEW TICKETS */}
        <div className="bg-slate-100/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                1. New Orders
              </h2>
            </div>
            <Badge className="bg-rose-600 text-white font-bold text-xs px-2 py-0.5">
              {newOrders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {newOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Utensils className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No new incoming orders</p>
              </div>
            ) : (
              newOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PREPARATION */}
        <div className="bg-slate-100/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                2. Cooking / Preparing
              </h2>
            </div>
            <Badge className="bg-blue-600 text-white font-bold text-xs px-2 py-0.5">
              {preparingOrders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No food currently cooking</p>
              </div>
            ) : (
              preparingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY TO SERVE */}
        <div className="bg-slate-100/60 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col h-full overflow-hidden shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                3. Ready for Service
              </h2>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs px-2 py-0.5">
              {readyOrders.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {readyOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-500">No orders awaiting pickup</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
