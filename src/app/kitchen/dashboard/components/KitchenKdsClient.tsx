"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  Clock, ChefHat, CheckCircle2, Play, Utensils, 
  Sparkles, RefreshCw, Bell, Search, AlertCircle, Check, 
  ArrowRight, Layers, Volume2, VolumeX, Package, BellRing, Settings2, Globe, Mic, MicOff, MessageSquare
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

// Convert Marathi/Hindi numerals and number words to standard digits
function normalizeNumbers(input: string): string {
  let text = input.toLowerCase();

  const marathiDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  for (const [mDigit, sDigit] of Object.entries(marathiDigits)) {
    text = text.replaceAll(mDigit, sDigit);
  }

  const numberWords: Record<string, string> = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'एक': '1', 'दोन': '2', 'तीन': '3', 'चार': '4', 'पाच': '5',
    'सहा': '6', 'सात': '7', 'आठ': '8', 'नऊ': '9', 'दहा': '10'
  };

  for (const [word, digit] of Object.entries(numberWords)) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    text = text.replace(regex, digit);
  }

  return text;
}

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
  const [activeTab, setActiveTab] = useState<"ALL" | "NEW" | "PREPARING" | "READY">("ALL");
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(new Set());
  
  // Voice Assistant States
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState<"mr" | "hi" | "en">("mr"); // Default to Marathi
  const [isReminderEnabled, setIsReminderEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  const announcedOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)));
  const lastReminderTimeRef = useRef<number>(Date.now());
  const recognitionRef = useRef<any>(null);
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

  const updateStatus = useCallback(async (id: string, status: string, customNotification?: string) => {
    // Prevent duplicate rapid taps on the same ticket
    setUpdatingOrderIds(prev => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        // Update local order status in place
        setOrders(prev => 
          status === "COMPLETED" 
            ? prev.filter(o => o.id !== id)
            : prev.map(o => o.id === id ? { ...o, status } : o)
        );
        toast({ title: customNotification || `Ticket updated to ${status.replace('_', ' ')}` });
        fetchOrders();
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error });
        fetchOrders();
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error" });
      fetchOrders();
    } finally {
      setUpdatingOrderIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [fetchOrders, toast]);

  // ====================================================
  // READ OUT CURRENT ORDERS IN QUEUE ALOUD
  // ====================================================
  const readOutCurrentOrdersQueue = useCallback(() => {
    const activeOrders = orders.filter(o => o.status !== "COMPLETED");
    if (activeOrders.length === 0) {
      const emptyMsg = {
        mr: "सध्या किचनमध्ये कोणतीही पेंडिंग ऑर्डर नाही. सर्व ऑर्डर्स पूर्ण झाल्या आहेत!",
        hi: "वर्तमान में किचन में कोई पेंडिंग आर्डर नहीं है। सभी आर्डर्स पूरे हो चुके हैं!",
        en: "There are currently no pending orders in the queue. The kitchen is all clear!"
      };
      speakCustomText(emptyMsg[voiceLanguage]);
      toast({ title: "📢 " + emptyMsg[voiceLanguage] });
      return;
    }

    let text = "";

    if (voiceLanguage === "mr") {
      text = `सध्या किचनमध्ये एकूण ${activeOrders.length} ऑर्डर्स चालू आहेत. `;
      activeOrders.forEach((o, index) => {
        const isParcel = o.type === "TAKEAWAY";
        const target = isParcel ? (o.groupName || "पार्सल") : `टेबल ${o.table?.number || ""}`;
        const statusLabel = o.status === "READY" ? "तयार आहे" : o.status === "PREPARING" ? "बनत आहे" : "नवीन ऑर्डर";
        const items = o.items.map(i => `${i.quantity} ${i.menuItem?.name}`).join(", ");
        text += `ऑर्डर ${index + 1}: ${target}, स्थिती: ${statusLabel}. पदार्थ: ${items}. `;
      });
    } else if (voiceLanguage === "hi") {
      text = `वर्तमान में किचन में कुल ${activeOrders.length} आर्डर्स हैं। `;
      activeOrders.forEach((o, index) => {
        const isParcel = o.type === "TAKEAWAY";
        const target = isParcel ? (o.groupName || "पार्सल") : `टेबल ${o.table?.number || ""}`;
        const statusLabel = o.status === "READY" ? "तैयार है" : o.status === "PREPARING" ? "बन रहा है" : "नया आर्डर";
        const items = o.items.map(i => `${i.quantity} ${i.menuItem?.name}`).join(", ");
        text += `आर्डर ${index + 1}: ${target}, स्थिति: ${statusLabel}. आइटम्स: ${items}। `;
      });
    } else {
      text = `Currently there are ${activeOrders.length} active orders in the queue. `;
      activeOrders.forEach((o, index) => {
        const isParcel = o.type === "TAKEAWAY";
        const target = isParcel ? (o.groupName || "Parcel") : `Table ${o.table?.number || ""}`;
        const statusLabel = o.status === "READY" ? "Ready" : o.status === "PREPARING" ? "Cooking" : "New Order";
        const items = o.items.map(i => `${i.quantity} ${i.menuItem?.name}`).join(", ");
        text += `Order ${index + 1}: ${target}, status: ${statusLabel}. Items: ${items}. `;
      });
    }

    speakCustomText(text);
    toast({ title: `📢 Reading out ${activeOrders.length} active orders in queue...` });
  }, [orders, voiceLanguage, speakCustomText, toast]);

  // ====================================================
  // AI VOICE COMMAND PROCESSOR (Specific Order & Status Changes)
  // ====================================================
  const processVoiceCommand = useCallback((rawTranscript: string) => {
    const transcript = normalizeNumbers(rawTranscript);
    const activeOrders = orders.filter(o => o.status !== "COMPLETED");

    // 1. Check for Order Status Action: START COOKING / PREPARING
    const isStartCooking = 
      transcript.includes("start") || 
      transcript.includes("cook") || 
      transcript.includes("सुरू") || 
      transcript.includes("बनवा") || 
      transcript.includes("चालू") ||
      transcript.includes("बनाओ");

    // 2. Check for Order Status Action: MARK READY
    const isMarkReady = 
      transcript.includes("ready") || 
      transcript.includes("तयार") || 
      transcript.includes("तैयार") ||
      transcript.includes("झाले") ||
      transcript.includes("झाली");

    // 3. Check for Order Status Action: MARK COMPLETED / SERVED / HANDED OVER
    const isMarkCompleted = 
      transcript.includes("complete") || 
      transcript.includes("served") || 
      transcript.includes("done") || 
      transcript.includes("दिले") || 
      transcript.includes("दिला") ||
      transcript.includes("दे दिया");

    // Try finding specific target order (by table number, parcel token, or customer name)
    const targetOrder = activeOrders.find(o => {
      // Table matching
      if (o.table?.number) {
        const tNum = o.table.number.toLowerCase();
        if (transcript.includes(`table ${tNum}`) || transcript.includes(`टेबल ${tNum}`) || transcript.includes(` ${tNum}`)) {
          return true;
        }
      }
      // Parcel token / name matching
      if (o.groupName) {
        const group = o.groupName.toLowerCase();
        // Check "P-101" or "101" or customer name
        const cleanToken = group.replace(/[^a-z0-9]/gi, '');
        if (transcript.includes(group) || (cleanToken && transcript.includes(cleanToken))) {
          return true;
        }
      }
      if (o.customer?.name) {
        const cName = o.customer.name.toLowerCase();
        if (transcript.includes(cName)) return true;
      }
      return false;
    });

    // --- CASE A: ACTION ON MATCHED ORDER ---
    if (targetOrder) {
      const orderLabel = targetOrder.type === "TAKEAWAY" 
        ? (targetOrder.groupName || "पार्सल") 
        : `टेबल ${targetOrder.table?.number || ""}`;

      if (isStartCooking) {
        updateStatus(targetOrder.id, "PREPARING");
        const reply = {
          mr: `${orderLabel} चे जेवण बनवणे सुरू केले आहे! 👨‍🍳`,
          hi: `${orderLabel} का खाना बनाना शुरू कर दिया गया है! 👨‍🍳`,
          en: `Started cooking for ${orderLabel}! 👨‍🍳`
        };
        speakCustomText(reply[voiceLanguage]);
        return;
      }

      if (isMarkReady) {
        updateStatus(targetOrder.id, "READY");
        const reply = {
          mr: `${orderLabel} ची ऑर्डर तयार झाली आहे, पॅक किंवा सर्व्ह करण्यासाठी सज्ज! 🛎️`,
          hi: `${orderLabel} का आर्डर तैयार हो गया है! 🛎️`,
          en: `${orderLabel} order is marked ready for service! 🛎️`
        };
        speakCustomText(reply[voiceLanguage]);
        return;
      }

      if (isMarkCompleted) {
        updateStatus(targetOrder.id, "COMPLETED");
        const reply = {
          mr: `${orderLabel} ची ऑर्डर पूर्ण झाली आहे! ✅`,
          hi: `${orderLabel} का आर्डर पूरा हो गया है! ✅`,
          en: `${orderLabel} order is completed! ✅`
        };
        speakCustomText(reply[voiceLanguage]);
        return;
      }

      // If just asking about this specific order's items:
      const itemsList = targetOrder.items.map(i => `${i.quantity} ${i.menuItem?.name}`).join(", ");
      const statusStr = targetOrder.status === "READY" ? "तयार आहे" : targetOrder.status === "PREPARING" ? "बनत आहे" : "नवीन ऑर्डर";
      const reply = {
        mr: `${orderLabel} ची ऑर्डर: ${itemsList}. स्थिती: ${statusStr}.`,
        hi: `${orderLabel} का आर्डर: ${itemsList}. स्थिति: ${statusStr}.`,
        en: `Order for ${orderLabel}: ${itemsList}. Current status: ${targetOrder.status}.`
      };
      speakCustomText(reply[voiceLanguage]);
      return;
    }

    // --- CASE B: GENERIC "START COOKING FIRST PARCEL" (if table wasn't numbered) ---
    if (isStartCooking && (transcript.includes("parcel") || transcript.includes("पार्सल"))) {
      const firstNewParcel = activeOrders.find(o => o.type === "TAKEAWAY" && (o.status === "PLACED" || o.status === "CONFIRMED"));
      if (firstNewParcel) {
        updateStatus(firstNewParcel.id, "PREPARING");
        const target = firstNewParcel.groupName || "पार्सल";
        const reply = {
          mr: `${target} चे जेवण बनवणे सुरू केले आहे! 👨‍🍳`,
          hi: `${target} का खाना बनाना शुरू कर दिया गया है! 👨‍🍳`,
          en: `Started cooking for ${target}! 👨‍🍳`
        };
        speakCustomText(reply[voiceLanguage]);
        return;
      }
    }

    // --- CASE C: GENERAL QUEUE INQUIRY OR FALLBACK ---
    readOutCurrentOrdersQueue();
  }, [orders, voiceLanguage, updateStatus, speakCustomText, readOutCurrentOrdersQueue]);

  // ====================================================
  // MICROPHONE VOICE COMMAND LISTENER (Speech Recognition)
  // ====================================================
  const startVoiceListening = useCallback(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      // Fallback if browser does not support mic recognition: directly read out orders
      readOutCurrentOrdersQueue();
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      if (voiceLanguage === "mr") {
        recognition.lang = "mr-IN";
      } else if (voiceLanguage === "hi") {
        recognition.lang = "hi-IN";
      } else {
        recognition.lang = "en-IN";
      }

      recognition.onstart = () => {
        setIsListening(true);
        toast({ 
          title: "🎙️ Listening to Chef...", 
          description: voiceLanguage === "mr" 
            ? "उदा. 'टेबल ४ सुरू करा' किंवा 'काय ऑर्डर्स आहेत?'" 
            : "E.g. 'Start cooking Table 4' or 'What are current orders?'" 
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        toast({ title: `🗣️ Voice Command: "${transcript}"` });
        
        // Process natural voice command
        processVoiceCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "no-speech" || event.error === "network") {
          // If no speech detected, give default queue summary
          readOutCurrentOrdersQueue();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech recognition error:", err);
      readOutCurrentOrdersQueue();
    }
  }, [isListening, voiceLanguage, processVoiceCommand, readOutCurrentOrdersQueue, toast]);



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
    const isUpdating = updatingOrderIds.has(order.id);

    if (isUpdating) {
      return (
        <Button
          disabled
          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold h-11 rounded-xl flex items-center justify-center space-x-2 text-sm cursor-not-allowed border border-slate-200 dark:border-slate-700"
        >
          <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
          <span>Updating Ticket...</span>
        </Button>
      );
    }

    if (order.status === 'PLACED' || order.status === 'CONFIRMED') {
      return (
        <Button
          onClick={() => updateStatus(order.id, 'PREPARING')}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold h-11 rounded-xl shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{isParcel ? "Start Cooking Parcel 👨‍🍳" : "Start Cooking 👨‍🍳"}</span>
        </Button>
      );
    }
    if (order.status === 'PREPARING') {
      return (
        <Button
          onClick={() => updateStatus(order.id, 'READY')}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold h-11 rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isParcel ? "Mark Parcel Ready 📦🛎️" : "Mark Ready to Serve 🛎️"}</span>
        </Button>
      );
    }
    if (order.status === 'READY') {
      return (
        <Button
          onClick={() => updateStatus(order.id, 'COMPLETED')}
          variant="outline"
          className="w-full border-2 border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold h-11 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm"
        >
          <Check className="w-4 h-4" />
          <span>{isParcel ? "Hand Over / Completed ✅" : "Mark Served to Table ✅"}</span>
        </Button>
      );
    }
    return null;
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const elapsed = getElapsedTime(order.createdAt);
    const diffMins = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
    const isNew = order.status === 'PLACED' || order.status === 'CONFIRMED';
    const isCooking = order.status === 'PREPARING';
    const isReady = order.status === 'READY';
    const isParcel = order.type === 'TAKEAWAY';

    // Elapsed time styling
    const isUrgent = diffMins >= 25;
    const isWarning = diffMins >= 15 && diffMins < 25;

    return (
      <div className={cn(
        "rounded-2xl border bg-white dark:bg-slate-900 p-3.5 flex flex-col h-[380px] shadow-xs hover:shadow-lg transition-all duration-200",
        isNew && "border-rose-300 dark:border-rose-900/70 ring-2 ring-rose-500/20 bg-gradient-to-b from-rose-50/20 to-white dark:from-rose-950/10 dark:to-slate-900",
        isCooking && "border-blue-300 dark:border-blue-900/70 ring-2 ring-blue-500/20 bg-gradient-to-b from-blue-50/20 to-white dark:from-blue-950/10 dark:to-slate-900",
        isReady && "border-emerald-300 dark:border-emerald-900/70 ring-2 ring-emerald-500/20 bg-gradient-to-b from-emerald-50/20 to-white dark:from-emerald-950/10 dark:to-slate-900",
        !isNew && !isCooking && !isReady && "border-slate-200 dark:border-slate-800"
      )}>
        {/* Card Header (Fixed at top) */}
        <div className="shrink-0 flex items-start justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              {isParcel ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs shrink-0">
                    <Package className="w-3 h-3" /> PARCEL
                  </span>
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {order.groupName || "Takeaway"}
                  </span>
                </div>
              ) : (
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center">
                  {order.table ? `Table ${order.table.number}` : 'Dine-In'}
                  {order.partyLabel && (
                    <span className="ml-1.5 text-xs font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Group {order.partyLabel}
                    </span>
                  )}
                </span>
              )}

              {isNew && (
                <span className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider shrink-0">
                  NEW
                </span>
              )}
              {isCooking && (
                <span className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Cooking
                </span>
              )}
              {isReady && (
                <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Ready
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              <span className="font-mono">#{order.id.slice(-6).toUpperCase()}</span>
              {order.table?.location && <span>• {order.table.location}</span>}
              {order.customer?.name && <span>• {order.customer.name}</span>}
              {order.guestCount && <span>• {order.guestCount} Pax</span>}
            </div>
          </div>

          {/* Time Badge */}
          <div className={cn(
            "flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 ml-2",
            isUrgent && "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse",
            isWarning && "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
            !isUrgent && !isWarning && "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          )}>
            <Clock className={cn("w-3.5 h-3.5 mr-0.5", isUrgent ? "text-rose-600" : isWarning ? "text-amber-600" : "text-slate-400")} />
            <span>{elapsed}</span>
          </div>
        </div>

        {/* Dish Items List (Scrollable middle container) */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2.5 space-y-2 pr-1 scrollbar-thin">
          {(!order.items || order.items.length === 0) ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">
              Order placed • Waiting for kitchen preparation...
            </p>
          ) : (
            order.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm group">
                <span className="w-6 h-6 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  {item.quantity}x
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug block">
                    {item.menuItem?.name || "Dish Item"}
                  </span>
                  
                  {item.specialInstructions && (
                    <div className="mt-0.5">
                      {item.specialInstructions.includes("ADD-ON") ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded shadow-2xs">
                          ⚡ Add-On
                        </span>
                      ) : item.specialInstructions.includes("PARCEL") ? (
                        isParcel ? null : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">
                            📦 Parcel Item
                          </span>
                        )
                      ) : (
                        <span className="inline-block bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[11px] px-1.5 py-0.2 rounded italic font-medium">
                          📝 {item.specialInstructions}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Button (Pinned firmly at bottom) */}
        <div className="shrink-0 pt-2.5 border-t border-slate-100 dark:border-slate-800">
          {renderOrderCardActions(order)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-12">
      {/* UNIFIED CONTROL BAR */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3.5 shadow-xs sticky top-2 z-20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Left: Stage Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              activeTab === "ALL"
                ? "bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-xs font-black"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Active</span>
            <span className={cn("text-[11px] px-1.5 py-0.2 rounded-full font-bold", activeTab === "ALL" ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300")}>
              {filteredOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("NEW")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap",
              activeTab === "NEW"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", activeTab === "NEW" ? "bg-white" : "bg-rose-500")} />
            <span>New</span>
            <span className={cn("text-[11px] px-1.5 py-0.2 rounded-full font-bold", activeTab === "NEW" ? "bg-rose-700/80 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300")}>
              {newOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("PREPARING")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap",
              activeTab === "PREPARING"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", activeTab === "PREPARING" ? "bg-white" : "bg-blue-500")} />
            <span>Cooking</span>
            <span className={cn("text-[11px] px-1.5 py-0.2 rounded-full font-bold", activeTab === "PREPARING" ? "bg-blue-700/80 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300")}>
              {preparingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("READY")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap",
              activeTab === "READY"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", activeTab === "READY" ? "bg-white" : "bg-emerald-500")} />
            <span>Ready</span>
            <span className={cn("text-[11px] px-1.5 py-0.2 rounded-full font-bold", activeTab === "READY" ? "bg-emerald-700/80 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300")}>
              {readyOrders.length}
            </span>
          </button>
        </div>

        {/* Right: Voice Controls, Type Filter & Search Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Voice Command Mic Button */}
          <Button
            onClick={startVoiceListening}
            size="sm"
            className={cn(
              "h-8.5 px-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0",
              isListening
                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
            title="Speak command (e.g. 'Start cooking table 4', 'Table 4 ready', 'What is queue?')"
          >
            <Mic className={cn("w-3.5 h-3.5", isListening && "animate-bounce")} />
            <span>
              {isListening
                ? "Listening..."
                : voiceLanguage === "mr"
                ? "व्हॉइस कमांड"
                : voiceLanguage === "hi"
                ? "वॉइस कमांड"
                : "Voice Command"}
            </span>
          </Button>

          {/* Voice Language Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl gap-0.5 shrink-0 border border-slate-200/80 dark:border-slate-800">
            <Globe className="w-3 h-3 text-slate-400 ml-1.5 mr-0.5 hidden xs:inline-block" />
            <button
              onClick={() => handleLanguageChange("mr")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all",
                voiceLanguage === "mr"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              मराठी
            </button>
            <button
              onClick={() => handleLanguageChange("hi")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all",
                voiceLanguage === "hi"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              हिंदी
            </button>
            <button
              onClick={() => handleLanguageChange("en")}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all",
                voiceLanguage === "en"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              )}
            >
              EN
            </button>
          </div>

          {/* Voice Mute/Unmute Toggle */}
          <Button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            size="sm"
            variant={isVoiceEnabled ? "default" : "outline"}
            className={cn(
              "h-8.5 text-xs rounded-xl font-bold px-2 transition-all shrink-0",
              isVoiceEnabled
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "text-slate-500 border-slate-200 dark:border-slate-800"
            )}
            title={isVoiceEnabled ? "Voice Announcements ON" : "Voice Muted"}
          >
            {isVoiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
          </Button>

          {/* Order Type Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl gap-1 shrink-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setOrderTypeFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                orderTypeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              All
            </button>
            <button
              onClick={() => setOrderTypeFilter("DINE_IN")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap",
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
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 whitespace-nowrap",
                orderTypeFilter === "TAKEAWAY"
                  ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-50"
              )}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Parcels ({takeawayCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-40 min-w-[120px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search table/item..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="h-8.5 text-xs pl-8 w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl"
            />
          </div>
          
          <Button
            onClick={() => {
              setIsRefreshing(true);
              fetchOrders();
            }}
            size="icon"
            variant="outline"
            className="h-8.5 w-8.5 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shrink-0"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ORDERS GRID FEED */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {activeTab === "NEW" && (
          newOrders.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 col-span-full shadow-xs">
              <Utensils className="w-12 h-12 mx-auto mb-3 opacity-25 text-rose-500" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">No new incoming orders</p>
              <p className="text-xs text-slate-400 mt-1">New customer and takeaway orders will appear here</p>
            </div>
          ) : (
            newOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}

        {activeTab === "PREPARING" && (
          preparingOrders.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 col-span-full shadow-xs">
              <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-25 text-blue-500" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">No food currently cooking</p>
              <p className="text-xs text-slate-400 mt-1">Tap &apos;Start Cooking&apos; on any new order ticket</p>
            </div>
          ) : (
            preparingOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}

        {activeTab === "READY" && (
          readyOrders.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 col-span-full shadow-xs">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-25 text-emerald-500" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">No orders awaiting pickup</p>
              <p className="text-xs text-slate-400 mt-1">Dishes marked ready will appear here for staff to serve</p>
            </div>
          ) : (
            readyOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}

        {activeTab === "ALL" && (
          filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 col-span-full shadow-xs">
              <Utensils className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">No active kitchen orders</p>
              <p className="text-xs text-slate-400 mt-1">All kitchen orders are cleared</p>
            </div>
          ) : (
            filteredOrders.map(order => <OrderCard key={order.id} order={order} />)
          )
        )}
      </div>
    </div>
  );
}
