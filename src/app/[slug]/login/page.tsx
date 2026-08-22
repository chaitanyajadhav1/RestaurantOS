"use client";

import { useState, use } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Phone, Loader2, UtensilsCrossed, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-6">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif text-amber-50 mb-2">Welcome Guest</h1>
          <p className="text-zinc-400">Enter your mobile number to view the menu and place your order.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-6 sm:p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-amber-500/80 mb-2 uppercase tracking-widest">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-lg"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-500/80 mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all text-lg"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl p-[1px]"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-300"></span>
              <div className="relative flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm px-4 py-3.5 rounded-2xl group-hover:bg-transparent transition-colors duration-300">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                ) : (
                  <span className="font-semibold text-amber-400 group-hover:text-zinc-950 transition-colors duration-300 text-lg">
                    Continue to Menu
                  </span>
                )}
              </div>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-zinc-500 text-sm">
              Don't have an account?{" "}
              <Link href={`/${slug}/signup`} className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
