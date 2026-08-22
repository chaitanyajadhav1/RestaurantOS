"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UtensilsCrossed, Loader2, ShieldCheck, Mail, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<"super_admin" | "other" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, secretKey }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Super Admin account created! Please sign in.");
        router.push("/login");
      } else {
        toast.error("Signup Failed", { description: data.message });
      }
    } catch {
      toast.error("An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-white shadow-lg">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Restaurant OS</h1>
        <p className="text-slate-500">Account Setup</p>
      </div>

      {/* Step 1: Role selection */}
      {selectedRole === null && (
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center">Who are you?</CardTitle>
            <CardDescription className="text-center">
              Select your role to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => setSelectedRole("super_admin")}
              className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-slate-900 hover:bg-slate-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Super Admin</div>
                <div className="text-xs text-slate-500">Company-level account. Requires an admin secret key.</div>
              </div>
            </button>
            <button
              onClick={() => setSelectedRole("other")}
              className="w-full flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-700">Hotel Admin / Staff</div>
                <div className="text-xs text-slate-500">Accounts are created via invite links only.</div>
              </div>
            </button>
          </CardContent>
          <div className="flex justify-center border-t border-slate-100 pt-6 pb-6">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <a href="/login" className="font-semibold text-slate-900 hover:underline">
                Sign In
              </a>
            </p>
          </div>
        </Card>
      )}

      {/* Step 2a: Invitation only screen */}
      {selectedRole === "other" && (
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="py-12 text-center space-y-5">
            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
              <Mail className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Invitation Only</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">
                Hotel Admin and Staff accounts are created exclusively via invite links. Please ask your administrator to send you an invite.
              </p>
            </div>
            <button
              onClick={() => setSelectedRole(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </CardContent>
          <div className="flex justify-center border-t border-slate-100 pt-6 pb-6">
            <a href="/login" className="text-sm font-semibold text-slate-900 hover:underline">
              Return to Login
            </a>
          </div>
        </Card>
      )}

      {/* Step 2b: Super Admin signup form */}
      {selectedRole === "super_admin" && (
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Super Admin Setup
            </CardTitle>
            <CardDescription className="text-center">
              Enter your admin secret key to proceed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secretKey">Admin Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="Enter the admin secret key"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                  className="h-12"
                />
                <p className="text-xs text-slate-400">This key is set in the server environment by your technical team.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Rajesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="superadmin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-lg mt-4"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Super Admin Account"
                )}
              </Button>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 mt-2"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
