"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface SidebarProps {
  orgName: string;
  orgLocation?: string | null;
  pendingDrafts?: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({
  orgName,
  orgLocation,
  pendingDrafts = 0,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Ringkasan",
      href: "/dashboard",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "Input Pintar AI",
      href: "/ai-input",
      badge: pendingDrafts,
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
          />
        </svg>
      ),
    },
    {
      label: "Buku Kas",
      href: "/transactions",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      ),
    },
    {
      label: "Data Nelayan",
      href: "/fishermen",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
      ),
    },
    {
      label: "Laporan Malam",
      href: "/reports",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
          />
        </svg>
      ),
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1017] border-r border-[#1e232e] text-[#ececec]">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1e232e] flex items-center justify-between">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-full bg-[#151922] border border-[#262c3a] flex items-center justify-center overflow-hidden p-1.5 group-hover:border-[#158052] transition-colors">
            <Image
              src="/images/logo.png"
              alt="Logo TangkapanKu"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-[0.24em] text-white uppercase">
              TANGKAPANKU
            </span>
            <span className="text-[9px] tracking-[0.16em] text-[#4ec38e] uppercase mt-0.5">
              Coastal AI Ledger
            </span>
          </div>
        </Link>

        {/* Close Button (Mobile Only) */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden w-8 h-8 rounded-full border border-[#262c3a] bg-[#151922] flex items-center justify-center text-xs text-[#9aa3b2] hover:text-white"
          aria-label="Tutup Menu"
        >
          ✕
        </button>
      </div>

      {/* Active Organization Card */}
      <div className="px-5 pt-5">
        <div className="rounded-2xl bg-[#11141b] border border-[#1e232e] p-4">
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6d7687] block">
            ORGANISASI AKTIF
          </span>
          <p className="text-sm font-semibold text-white mt-1 truncate">
            {orgName}
          </p>
          {orgLocation && (
            <p className="text-[11px] text-[#8b94a5] mt-0.5 truncate">
              {orgLocation}
            </p>
          )}
        </div>
      </div>

      {/* Quick Action CTA */}
      <div className="px-5 pt-4">
        <Link
          href="/ai-input"
          onClick={onCloseMobile}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-[#158052] hover:bg-[#19935f] text-white text-xs uppercase tracking-[0.16em] font-bold transition-colors"
        >
          <span>+ Catat Transaksi</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <span className="px-3 text-[10px] font-mono uppercase tracking-[0.22em] text-[#6d7687] block mb-2">
          Menu Utama
        </span>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[#101c17] text-[#4ec38e] border border-[#22382e]"
                  : "text-[#9aa3b2] hover:bg-[#151922] hover:text-white border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={isActive ? "text-[#4ec38e]" : "text-[#6d7687]"}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#261f14] border border-[#3d311e] font-mono text-[10px] font-semibold text-[#d9a05b]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Logout Section */}
      <div className="p-5 border-t border-[#1e232e] bg-[#0b0e14]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[#6d7687]">
            Sesi Terenkripsi
          </span>
          <LogoutButton />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#090b0e]/80 z-40 lg:hidden"
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
