// Shared Frame component for navigation header
"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="w-full flex justify-center items-center py-3 bg-gray-950/90 border-b border-gray-800 sticky top-0 z-50">
        <div className="flex flex-row gap-8">
          <Link
            href="/"
            className={pathname === "/" ? "text-indigo-400 font-bold" : "text-gray-200 hover:text-indigo-300 font-semibold"}
            prefetch={false}
          >
            Home
          </Link>
          <Link
            href="/admin"
            className={pathname.startsWith("/admin") ? "text-indigo-400 font-bold" : "text-gray-200 hover:text-indigo-300 font-semibold"}
            prefetch={false}
          >
            Admin
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
