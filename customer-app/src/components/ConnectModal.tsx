import React, { useState } from 'react';
import { Store, Phone, User, Globe, ArrowRight, UtensilsCrossed, Lock, Eye, EyeOff, Loader2, Moon, Sun, AlertCircle } from 'lucide-react';
import { getBaseUrl, setBaseUrl, getDefaultSlug, api } from '../services/api';

interface ConnectModalProps {
  onConnect: (config: { slug: string; name: string; phone: string }) => void;
  initialSlug?: string;
  initialName?: string;
  initialPhone?: string;
}

export function ConnectModal({ onConnect, initialSlug, initialName = '', initialPhone = '' }: ConnectModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [slug, setSlug] = useState(initialSlug || getDefaultSlug());
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!slug.trim()) {
      setError('Please enter restaurant code');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your mobile number');
      return;
    }

    setBaseUrl(serverUrl);
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!password) {
          setError('Please enter your password');
          setLoading(false);
          return;
        }

        const data = await api.login({
          phone: phone.trim(),
          password,
          restaurantSlug: slug.trim().toLowerCase()
        });

        onConnect({
          slug: slug.trim().toLowerCase(),
          name: data.name || name.trim() || 'Guest',
          phone: phone.trim()
        });
      } else {
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        const data = await api.signup({
          name: name.trim(),
          phone: phone.trim(),
          password,
          restaurantSlug: slug.trim().toLowerCase()
        });

        onConnect({
          slug: slug.trim().toLowerCase(),
          name: data.name || name.trim(),
          phone: phone.trim()
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick guest bypass if needed
  const handleQuickGuest = () => {
    if (!slug.trim()) return;
    setBaseUrl(serverUrl);
    onConnect({
      slug: slug.trim().toLowerCase(),
      name: name.trim() || 'Guest Diner',
      phone: phone.trim() || 'Guest'
    });
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-center items-center p-4 transition-colors duration-200 relative">
      
      {/* Top Floating Theme Switcher */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 shadow-md text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-all active:scale-95"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-600" />}
        </button>
      </div>

      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/20 mb-3">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {tab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {tab === 'login' ? 'Log in with your phone & password to order' : 'Sign up to explore the menu and place orders'}
          </p>
        </div>

        {/* Modal Card */}
        <div className="bg-white dark:bg-zinc-900/90 backdrop-blur-xl border border-stone-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl space-y-4">
          
          {/* Tabs: Log In / Sign Up */}
          <div className="flex bg-stone-100 dark:bg-zinc-800/70 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'signup'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-start space-x-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Restaurant Slug */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-zinc-600 dark:text-amber-400/90 tracking-wider flex items-center">
                <Store className="w-3.5 h-3.5 mr-1 text-amber-500" /> Restaurant Code / Slug
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="the-golden-spoon"
                className="w-full bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 rounded-2xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Name (Sign up only) */}
            {tab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-zinc-600 dark:text-amber-400/90 tracking-wider flex items-center">
                  <User className="w-3.5 h-3.5 mr-1 text-blue-500" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 rounded-2xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all font-medium"
                />
              </div>
            )}

            {/* Mobile Number */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-zinc-600 dark:text-amber-400/90 tracking-wider flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Mobile Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 rounded-2xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all font-medium"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-zinc-600 dark:text-amber-400/90 tracking-wider flex items-center">
                <Lock className="w-3.5 h-3.5 mr-1 text-amber-500" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                  className="w-full bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 rounded-2xl pl-3.5 pr-10 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Configure Server URL toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-medium flex items-center pt-1"
              >
                <Globe className="w-3 h-3 mr-1" /> {showAdvanced ? 'Hide Server URL' : 'Configure Server URL'}
              </button>
              {showAdvanced && (
                <div className="mt-1.5 space-y-1">
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://restaurant-os-bay.vercel.app"
                    className="w-full bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-98 text-zinc-950 font-black h-12 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 text-sm uppercase tracking-wider transition-all mt-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{tab === 'login' ? 'Continue to Menu' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Guest Option */}
            <div className="pt-2 text-center border-t border-stone-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleQuickGuest}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 font-semibold"
              >
                Or browse as Guest without password →
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
