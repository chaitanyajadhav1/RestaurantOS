"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, UtensilsCrossed, ShoppingBag, 
  ReceiptText, ChefHat, LogOut, Menu, Shield, Armchair, X, PlusCircle, Zap 
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { ServiceRequestBell } from "./ServiceRequestBell";
import type { Session } from "next-auth";

export function Navigation({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Only show staff navigation on internal back-office routes
  const isInternalRoute = 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/staff") || 
    pathname.startsWith("/kitchen") || 
    pathname.startsWith("/super-admin");

  if (!session || !isInternalRoute || session.user.role === "CUSTOMER") {
    return null;
  }

  const role = session?.user?.role;

  const navItems = [];

  if (role === "SUPER_ADMIN") {
    navItems.push({ href: "/super-admin", label: "Super Admin", icon: <Shield className="w-4 h-4" /> });
  }

  if (role === "RESTAURANT_ADMIN" || role === "MANAGER") {
    navItems.push({ href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> });
    navItems.push({ href: "/admin/tables", label: "Floor & Queue", icon: <Armchair className="w-4 h-4" /> });
    navItems.push({ href: "/staff/pos", label: "Take Order", icon: <PlusCircle className="w-4 h-4 text-emerald-500" /> });
    navItems.push({ href: "/staff/addons", label: "Quick Add-Ons", icon: <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> });
    navItems.push({ href: "/admin/menu", label: "Menu Mgt", icon: <UtensilsCrossed className="w-4 h-4" /> });
    navItems.push({ href: "/admin/staff", label: "Staff Mgt", icon: <Users className="w-4 h-4" /> });
    navItems.push({ href: "/staff/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> });
    navItems.push({ href: "/staff/billing", label: "Billing", icon: <ReceiptText className="w-4 h-4" /> });
    navItems.push({ href: "/kitchen/dashboard", label: "Kitchen (KDS)", icon: <ChefHat className="w-4 h-4" /> });
  }

  if (role === "WAITER" || role === "CASHIER") {
    navItems.push({ href: "/staff/pos", label: "Take Order (POS)", icon: <PlusCircle className="w-4 h-4 text-emerald-500" /> });
    navItems.push({ href: "/staff/addons", label: "Quick Add-Ons", icon: <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> });
    navItems.push({ href: "/staff/tables", label: "Floor & Seating", icon: <Armchair className="w-4 h-4" /> });
    navItems.push({ href: "/staff/queue", label: "Queue", icon: <Users className="w-4 h-4" /> });
    navItems.push({ href: "/staff/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> });
    navItems.push({ href: "/staff/billing", label: "Billing", icon: <ReceiptText className="w-4 h-4" /> });
  }

  if (role === "KITCHEN_STAFF") {
    navItems.push({ href: "/kitchen/dashboard", label: "Kitchen (KDS)", icon: <ChefHat className="w-4 h-4" /> });
  }

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex justify-between items-center shadow-xs">
        <div className="flex items-center space-x-2">
          <span className="font-black tracking-tight text-lg bg-gradient-to-r from-slate-900 to-indigo-700 dark:from-white dark:to-indigo-300 bg-clip-text text-transparent">
            Resto OS
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {role.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <ServiceRequestBell />
          <ThemeToggle />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(!isOpen)} 
            aria-label="Toggle Navigation Menu"
            className="hover:bg-slate-100 dark:hover:bg-slate-800 h-9 w-9 rounded-xl"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Backdrop & Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsOpen(false)} 
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-black text-xl tracking-tight block">Resto OS</span>
                <span className="text-xs text-slate-500">{session.user.name} ({role.replace('_', ' ')})</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Drawer Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all",
                      isActive 
                        ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs" 
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <span className={cn(
                      "p-1.5 rounded-lg", 
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Theme</span>
                <ThemeToggle />
              </div>
              <Button 
                variant="outline" 
                onClick={() => signOut({ callbackUrl: "/login" })} 
                className="w-full text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 font-bold h-10 rounded-xl flex items-center justify-center text-sm"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Nav Topbar */}
      <nav className="hidden md:flex bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 items-center justify-between px-6 py-2.5 shadow-xs sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-1">
          <div className="font-black text-slate-950 dark:text-white mr-6 tracking-tighter text-xl">
            Resto OS
          </div>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors",
                  isActive 
                    ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-2xs" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="flex items-center space-x-3">
          <ServiceRequestBell />
          <ThemeToggle />
          
          <div className="text-xs text-right border-l border-slate-200 dark:border-slate-800 pl-3">
            <span className="block text-slate-900 dark:text-white font-bold leading-tight">{session.user.name}</span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{session.user.role.replace('_', ' ')}</span>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => signOut({ callbackUrl: "/login" })} 
            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-8 px-2.5"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
          </Button>
        </div>
      </nav>
    </>
  );
}
