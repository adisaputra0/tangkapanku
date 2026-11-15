"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950/50 border border-red-900/60 hover:bg-red-900/40 rounded-lg transition disabled:opacity-50"
    >
      {loading ? "Keluar..." : "Logout"}
    </button>
  );
}
