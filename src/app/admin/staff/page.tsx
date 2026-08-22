"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, UserPlus, Send, Check, Copy, Mail, Shield,
  Loader2, X, Clock, BadgeCheck, ChefHat, UtensilsCrossed,
  CreditCard, BriefcaseBusiness,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
};

const STAFF_ROLES = [
  { value: "RESTAURANT_ADMIN", label: "Restaurant Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "CASHIER", label: "Cashier" },
  { value: "WAITER", label: "Waiter" },
  { value: "KITCHEN_STAFF", label: "Kitchen Staff" },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  SUPER_ADMIN:       { label: "Super Admin",       color: "text-violet-700", bg: "bg-violet-100",  icon: <Shield className="w-3 h-3" /> },
  RESTAURANT_ADMIN:  { label: "Restaurant Admin",  color: "text-blue-700",   bg: "bg-blue-100",    icon: <Shield className="w-3 h-3" /> },
  MANAGER:           { label: "Manager",           color: "text-indigo-700", bg: "bg-indigo-100",  icon: <BriefcaseBusiness className="w-3 h-3" /> },
  CASHIER:           { label: "Cashier",           color: "text-amber-700",  bg: "bg-amber-100",   icon: <CreditCard className="w-3 h-3" /> },
  WAITER:            { label: "Waiter",            color: "text-sky-700",    bg: "bg-sky-100",     icon: <UtensilsCrossed className="w-3 h-3" /> },
  KITCHEN_STAFF:     { label: "Kitchen Staff",     color: "text-orange-700", bg: "bg-orange-100",  icon: <ChefHat className="w-3 h-3" /> },
};

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-indigo-500",
  "bg-rose-500", "bg-emerald-500", "bg-amber-500",
  "bg-sky-500", "bg-pink-500", "bg-teal-500",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role.replace(/_/g, " "), color: "text-slate-700", bg: "bg-slate-100", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", cfg.bg, cfg.color)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function StaffManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [useInviteMode, setUseInviteMode] = useState(true);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("WAITER");
  const [submitting, setSubmitting] = useState(false);
  const [newInviteLink, setNewInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/restaurant-admin/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
        setInvitations(data.pendingInvitations || []);
      }
    } catch {
      toast.error("Failed to load staff data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !["SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER"].includes(session.user.role)) {
      router.push("/");
      return;
    }
    fetchData();
  }, [session, status, router, fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNewInviteLink("");
    try {
      const payload = useInviteMode
        ? { email, role, useInvite: true }
        : { email, name, password, role, useInvite: false };

      const res = await fetch("/api/restaurant-admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }

      if (useInviteMode) {
        setNewInviteLink(data.inviteUrl);
        toast.success("Invitation link generated!");
      } else {
        toast.success("Staff member created!");
        setShowAddModal(false);
        resetForm();
      }
      fetchData();
    } catch {
      toast.error("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => { setEmail(""); setName(""); setPassword(""); setRole("WAITER"); setNewInviteLink(""); };
  const copyLink = () => {
    navigator.clipboard.writeText(newInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "RESTAURANT_ADMIN";

  // Exclude Super Admins — they are platform-level, not hotel staff
  const roleOrder = ["RESTAURANT_ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN_STAFF"];
  const sortedStaff = [...staff]
    .filter(s => s.role !== "SUPER_ADMIN")
    .sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));


  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team</h1>
          <p className="text-slate-500 text-sm mt-1">
            {sortedStaff.length} active member{sortedStaff.length !== 1 ? "s" : ""}
            {invitations.length > 0 && ` · ${invitations.length} pending invite${invitations.length !== 1 ? "s" : ""}`}
          </p>

        </div>
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Staff Cards ────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-3">
          {sortedStaff.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No team members yet</p>
            </div>
          ) : (
            sortedStaff.map((member) => (
              <div
                key={member.id}
                className="group bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center justify-between gap-4 hover:border-slate-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base uppercase shrink-0 shadow-sm", getAvatarColor(member.name))}>
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{member.name}</div>
                    <div className="text-sm text-slate-400 truncate">{member.email}</div>
                  </div>
                </div>
                <div className="shrink-0">
                  <RoleBadge role={member.role} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Pending Invitations ────────────────────────────── */}
        {isAdmin && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Pending Invites ({invitations.length})
            </h2>

            {invitations.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <Mail className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invite) => {
                  const hoursLeft = Math.round((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60));
                  const isExpiringSoon = hoursLeft < 12;
                  return (
                    <div key={invite.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{invite.email}</p>
                        <RoleBadge role={invite.role} />
                      </div>
                      <div className={cn("text-xs flex items-center gap-1 mt-2", isExpiringSoon ? "text-rose-500" : "text-slate-400")}>
                        <Clock className="w-3 h-3" />
                        Expires in {hoursLeft}h
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick stats */}
            <div className="mt-4 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Roles Breakdown</p>
              <div className="space-y-2">
                {roleOrder.filter(r => staff.some(s => s.role === r)).map(r => {
                  const count = staff.filter(s => s.role === r).length;
                  const cfg = ROLE_CONFIG[r];
                  return (
                    <div key={r} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", cfg?.bg.replace("bg-", "bg-").replace("-100", "-400"))} />
                        <span className="text-xs text-slate-600">{cfg?.label ?? r}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Staff Modal ──────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">

            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">Invite Team Member</h2>
                <p className="text-sm text-slate-500 mt-0.5">Send a secure invite link or create directly</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              {newInviteLink ? (
                /* ── Invite success state ── */
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <BadgeCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Invite Link Ready!</h3>
                    <p className="text-sm text-slate-500 mt-1">Share this with the new team member. It expires in 72 hours.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-3 text-left">
                    <div className="flex-1 text-xs font-mono text-slate-600 truncate select-all">{newInviteLink}</div>
                    <button
                      onClick={copyLink}
                      className={cn(
                        "shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all",
                        copied ? "bg-emerald-500 text-white scale-95" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowAddModal(false); setNewInviteLink(""); }}
                    className="w-full text-sm font-semibold text-slate-500 hover:text-slate-900 py-2 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Mode toggle */}
                  <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                    {[
                      { id: true,  icon: <Send className="w-3.5 h-3.5" />, label: "Send Invite Link" },
                      { id: false, icon: <UserPlus className="w-3.5 h-3.5" />, label: "Create Directly" },
                    ].map(opt => (
                      <button
                        key={String(opt.id)}
                        type="button"
                        onClick={() => setUseInviteMode(opt.id)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-lg transition-all",
                          useInviteMode === opt.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Role selector boxes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {STAFF_ROLES.map(r => {
                        const cfg = ROLE_CONFIG[r.value];
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setRole(r.value)}
                            className={cn(
                              "flex flex-col items-center p-2.5 border-2 rounded-xl text-xs font-semibold transition-all gap-1",
                              role === r.value
                                ? "border-slate-900 bg-slate-900 text-white scale-[1.03] shadow-md"
                                : "border-slate-100 bg-white text-slate-600 hover:border-slate-300"
                            )}
                          >
                            <span className={cn("p-1.5 rounded-lg", role === r.value ? "bg-white/20" : cfg?.bg)}>
                              <span className={role === r.value ? "text-white" : cfg?.color}>
                                {cfg?.icon}
                              </span>
                            </span>
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
                    <input
                      type="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="staff@example.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-shadow"
                    />
                  </div>

                  {!useInviteMode && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                        <input
                          type="text" required
                          value={name} onChange={e => setName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Temporary Password</label>
                        <input
                          type="text" required minLength={6}
                          value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="submit" disabled={submitting}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : useInviteMode ? (
                      <><Send className="w-4 h-4" /> Generate Invite Link</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Create Account</>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
