"use client";

import { useState, use } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, UtensilsCrossed, Lock, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CustomerLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid mobile number");
      return;
    }
    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    
    try {
      const result = await signIn("credentials", {
        isCustomer: "true",
        phone,
        password,
        restaurantSlug: slug,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Welcome!");
        router.push(`/${slug}`);
        router.refresh();
      }
    } catch (error) {
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 transition-colors duration-200 relative">
      
      {/* Top Floating Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/20 mb-4">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold text-zinc-900 dark:text-white mb-1.5">
            Welcome Guest
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Enter your mobile number to view the menu and place orders.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900/90 backdrop-blur-xl border border-stone-200 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-amber-400/90 uppercase tracking-wider">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-medium"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-amber-400/90 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-medium"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center text-sm uppercase tracking-wider"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Continue to Menu →</span>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-stone-100 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400 text-xs">
              Don't have an account?{" "}
              <Link href={`/${slug}/signup`} className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
