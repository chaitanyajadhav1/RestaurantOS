"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, UtensilsCrossed, ShoppingBag, ReceiptText, ChefHat, LogOut, Menu, Shield, Armchair } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import type { Session } from "next-auth";

export function Navigation({ session }: { session: Session | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
    // Super Admin only sees their own panel
    navItems.push({ href: "/super-admin", label: "Super Admin", icon: <Shield className="w-4 h-4" /> });
  }

  if (role === "RESTAURANT_ADMIN" || role === "MANAGER") {
    // Hotel-level management
    navItems.push({ href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> });
    navItems.push({ href: "/admin/tables", label: "Floor & Queue", icon: <Armchair className="w-4 h-4" /> });
    navItems.push({ href: "/admin/menu", label: "Menu Mgt", icon: <UtensilsCrossed className="w-4 h-4" /> });
    navItems.push({ href: "/admin/staff", label: "Staff Mgt", icon: <Users className="w-4 h-4" /> });
    navItems.push({ href: "/staff/queue", label: "Queue Only", icon: <Users className="w-4 h-4" /> });
    navItems.push({ href: "/staff/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> });
    navItems.push({ href: "/staff/billing", label: "Billing", icon: <ReceiptText className="w-4 h-4" /> });
    navItems.push({ href: "/kitchen/dashboard", label: "Kitchen (KDS)", icon: <ChefHat className="w-4 h-4" /> });
  }

  if (role === "WAITER" || role === "CASHIER") {
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
      {/* Mobile Nav Toggle */}
      <div className="md:hidden p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <span className="font-bold tracking-tight">Resto OS</span>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="hover:bg-slate-100 dark:hover:bg-slate-800">
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Nav Topbar */}
      <nav className={cn(
        "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 md:flex flex-col md:flex-row md:items-center justify-between px-6 py-2.5 shadow-xs z-50",
        isOpen ? "block" : "hidden md:flex"
      )}>
        <div className="flex flex-col md:flex-row md:items-center md:space-x-1 space-y-2 md:space-y-0">
          <div className="hidden md:block font-black text-slate-950 dark:text-white mr-6 tracking-tighter text-xl">
            Resto OS
          </div>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-colors",
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
        
        <div className="mt-3 md:mt-0 pt-3 md:pt-0 border-t border-slate-200 dark:border-slate-800 md:border-0 flex items-center justify-between md:justify-end space-x-3">
          <ThemeToggle />
          
          <div className="text-xs hidden md:block text-right border-l border-slate-200 dark:border-slate-800 pl-3">
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
