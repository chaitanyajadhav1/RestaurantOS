"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, UtensilsCrossed, User, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function CustomerSignupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid mobile number");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch("/api/customer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, restaurantSlug: slug })
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Signup failed");
      } else {
        toast.success("Account created! Please log in.");
        router.push(`/${slug}/login`);
      }
    } catch (error) {
      toast.error("An error occurred during signup");
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
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Join us to explore the menu and place orders.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900/90 backdrop-blur-xl border border-stone-200 dark:border-zinc-800 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-amber-400/90 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-medium"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
            </div>

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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all text-sm font-medium"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center text-sm uppercase tracking-wider mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Create Account →</span>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-stone-100 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400 text-xs">
              Already have an account?{" "}
              <Link href={`/${slug}/login`} className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
