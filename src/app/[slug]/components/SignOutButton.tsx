"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button 
      onClick={() => signOut()}
      className="flex items-center gap-2 text-sm text-zinc-500 hover:text-amber-500 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      <span>Exit</span>
    </button>
  );
}
