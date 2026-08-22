"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2, Plus, Send, Copy, Check, Users,
  UtensilsCrossed, ShoppingBag, Loader2, X, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Restaurant = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
  _count: { users: number; tables: number; orders: number };
};

const ADMIN_INVITE_ROLES = [
  { value: "RESTAURANT_ADMIN", label: "Restaurant Admin", desc: "Full control of this hotel" },
  { value: "MANAGER", label: "Manager", desc: "Manages operations & staff" },
];

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Create hotel form
  const [showCreateHotel, setShowCreateHotel] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [creatingHotel, setCreatingHotel] = useState(false);

  // Invite form
  const [inviteRestaurantId, setInviteRestaurantId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("RESTAURANT_ADMIN");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    const res = await fetch("/api/super-admin/restaurants");
    const data = await res.json();
    setRestaurants(data.restaurants || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }
    fetchRestaurants();
  }, [session, status, router, fetchRestaurants]);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingHotel(true);
    try {
      const res = await fetch("/api/super-admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: hotelName, address: hotelAddress, phone: hotelPhone }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }
      toast.success(`Hotel "${hotelName}" created!`);
      setHotelName(""); setHotelAddress(""); setHotelPhone("");
      setShowCreateHotel(false);
      fetchRestaurants();
    } finally {
      setCreatingHotel(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent, restaurantId: string) => {
    e.preventDefault();
    if (!inviteEmail) { toast.error("Please enter an email"); return; }
    setSendingInvite(true);
    setInviteRestaurantId(restaurantId);
    setInviteLink("");
    try {
      const res = await fetch("/api/super-admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, restaurantId, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }
      setInviteLink(data.inviteUrl);
      toast.success("Invite link generated!");
    } finally {
      setSendingInvite(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success("Link copied!");
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Super Admin Panel</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage all hotel workspaces and invitations</p>
          </div>
          <button
            onClick={() => setShowCreateHotel(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Hotel
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Create Hotel Modal */}
        {showCreateHotel && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Create New Hotel</h2>
                <button onClick={() => setShowCreateHotel(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateHotel} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hotel Name *</label>
                  <input
                    value={hotelName} onChange={e => setHotelName(e.target.value)} required
                    placeholder="e.g. The Grand Palace"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    value={hotelAddress} onChange={e => setHotelAddress(e.target.value)}
                    placeholder="123 MG Road, Bengaluru"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    value={hotelPhone} onChange={e => setHotelPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <button
                  type="submit" disabled={creatingHotel}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingHotel ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Hotel"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Hotels List */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
            All Hotels ({restaurants.length})
          </h2>
          <div className="space-y-3">
            {restaurants.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hotels yet. Create your first one!</p>
              </div>
            ) : (
              restaurants.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-400">{r.address || "No address set"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex gap-6 text-center">
                        <div>
                          <div className="text-lg font-black text-slate-900">{r._count.users}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Staff</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900">{r._count.tables}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" /> Tables</div>
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900">{r._count.orders}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Orders</div>
                        </div>
                      </div>
                      {expandedId === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded: Invite Form */}
                  {expandedId === r.id && (
                    <div className="border-t border-slate-100 px-6 py-5 bg-slate-50">
                      <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Send className="w-4 h-4" /> Invite Admin / Manager
                      </h3>
                      <form onSubmit={e => handleSendInvite(e, r.id)} className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email" required placeholder="admin@theirhotel.com"
                          value={inviteRestaurantId === r.id ? inviteEmail : ""}
                          onChange={e => { setInviteRestaurantId(r.id); setInviteEmail(e.target.value); }}
                          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                        />
                        <select
                          value={inviteRole}
                          onChange={e => setInviteRole(e.target.value)}
                          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                        >
                          {ADMIN_INVITE_ROLES.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          disabled={sendingInvite}
                          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                        >
                          {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Generate Link
                        </button>
                      </form>

                      {inviteLink && inviteRestaurantId === r.id && (
                        <div className="mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                          <div className="flex-1 text-xs font-mono text-emerald-800 truncate">{inviteLink}</div>
                          <button
                            onClick={copyLink}
                            className={cn(
                              "shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors",
                              copiedLink
                                ? "bg-emerald-500 text-white"
                                : "bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                            )}
                          >
                            {copiedLink ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
