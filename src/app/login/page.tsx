"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UtensilsCrossed, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("restaurant_admin@demo.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        toast.error("Login Failed", { description: res.error });
      } else {
        toast.success("Welcome back!");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-white shadow-lg">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Restaurant OS</h1>
        <p className="text-slate-500">Sign in to manage your operations</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Use admin@demo.com or waiter@demo.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-3 mb-2">
              <Label>Select Role (Quick Login)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("restaurant_admin@demo.com");
                    setPassword("password123");
                  }}
                  className={`flex flex-col items-center justify-center p-2 border rounded-xl transition-all ${
                    email === "restaurant_admin@demo.com" 
                      ? "border-slate-900 bg-slate-900 text-white shadow-md scale-[1.02]" 
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold text-xs sm:text-sm">Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@demo.com");
                    setPassword("password123");
                  }}
                  className={`flex flex-col items-center justify-center p-2 border rounded-xl transition-all ${
                    email === "admin@demo.com" 
                      ? "border-slate-900 bg-slate-900 text-white shadow-md scale-[1.02]" 
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold text-xs sm:text-sm">Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("waiter@demo.com");
                    setPassword("password123");
                  }}
                  className={`flex flex-col items-center justify-center p-2 border rounded-xl transition-all ${
                    email === "waiter@demo.com" 
                      ? "border-slate-900 bg-slate-900 text-white shadow-md scale-[1.02]" 
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold text-xs sm:text-sm">Waiter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("kitchen_staff@demo.com");
                    setPassword("password123");
                  }}
                  className={`flex flex-col items-center justify-center p-2 border rounded-xl transition-all ${
                    email === "kitchen_staff@demo.com" 
                      ? "border-slate-900 bg-slate-900 text-white shadow-md scale-[1.02]" 
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold text-xs sm:text-sm">Kitchen</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="restaurant_admin@demo.com"
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
              className="w-full h-12 text-lg mt-6" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 border-t pt-6 border-slate-100">
            <p className="font-semibold mb-2">Demo Accounts (Pass: password123):</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-100 p-2 rounded">
                <span className="font-bold">Super Admin:</span><br/>restaurant_admin@demo.com
              </div>
              <div className="bg-slate-100 p-2 rounded">
                <span className="font-bold">Admin:</span><br/>admin@demo.com
              </div>
              <div className="bg-slate-100 p-2 rounded">
                <span className="font-bold">Waiter:</span><br/>waiter@demo.com
              </div>
              <div className="bg-slate-100 p-2 rounded">
                <span className="font-bold">Kitchen:</span><br/>kitchen_staff@demo.com
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-slate-400">
        Setting up for the first time?{" "}
        <a href="/signup" className="text-slate-600 hover:text-slate-900 hover:underline font-medium">
          Create Super Admin account
        </a>
      </p>

    </div>
  );
}
