"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(
          data.error || "Login gagal. Periksa kembali email dan password Anda.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    }
  };

  const fillDemoAccount = () => {
    setForm({
      email: "admin@tangkapanku.com",
      password: "TangkapanKu123!",
    });
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#ececec] flex flex-col justify-between p-6 md:p-10">
      {/* Top Minimalist Navigation */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-15 h-15 rounded-full bg-[#151922] border border-[#262c3a] flex items-center justify-center transition-colors duration-300">
            <Image
              src="/images/logo.png"
              alt="Logo TangkapanKu"
              width={500}
              height={500}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-[0.26em] text-white uppercase">
              TANGKAPANKU
            </span>
            <span className="text-[9px] tracking-[0.18em] text-[#8b94a5] uppercase mt-0.5">
              Coastal AI Ledger
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-[11px] uppercase tracking-[0.2em] text-[#9aa3b2] hover:text-white transition-colors"
        >
          &larr; Beranda
        </Link>
      </header>

      {/* Main Centered Login Card */}
      <main className="my-auto py-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-[32px] bg-[#11141b] border border-[#1e232e] p-8 sm:p-10">
            {/* Header */}
            <div className="mb-8">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#4ec38e] block mb-2.5">
                PORTAL PENGEPUL
              </span>
              <h1 className="text-3xl font-light tracking-tight text-white">
                Masuk ke{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  Buku Kas
                </span>
                .
              </h1>
              <p className="text-xs text-[#8b94a5] font-light mt-2 leading-relaxed">
                Kelola setoran tangkapan harian, saldo kasbon nelayan, dan
                laporan malam otomatis.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 rounded-2xl bg-[#241316] border border-[#4a2026] px-4 py-3 text-xs text-[#f28b96] leading-relaxed">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa3b2] mb-2"
                >
                  Alamat Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@tangkapanku.com"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-[#158052] transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#9aa3b2]"
                  >
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] font-mono uppercase tracking-wider text-[#8b94a5] hover:text-[#4ec38e] transition-colors"
                  >
                    {showPassword ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-4 py-3.5 rounded-2xl text-sm focus:outline-none focus:border-[#158052] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#158052] hover:bg-[#19935f] text-white py-4 rounded-full text-xs uppercase tracking-[0.22em] font-bold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? "Memverifikasi..." : "Masuk ke Dashboard →"}
              </button>
            </form>

            {/* Quick Fill Demo Helper */}
            <div className="mt-7 pt-6 border-t border-[#1e232e]">
              <div className="rounded-2xl bg-[#101c17] border border-[#22382e] p-4 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#4ec38e] block">
                    Ingin menguji sistem?
                  </span>
                  <span className="text-xs text-[#b7c4be]">
                    Samudra Jaya (Akun Demo)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="shrink-0 px-3.5 py-2 rounded-full bg-[#151922] border border-[#263b32] text-[11px] font-mono text-[#4ec38e] hover:bg-[#158052] hover:text-white transition-colors"
                >
                  Isi Otomatis
                </button>
              </div>
            </div>

            {/* Footer Link */}
            <p className="mt-6 text-xs text-center text-[#8b94a5]">
              Belum memiliki akun organisasi?{" "}
              <Link
                href="/register"
                className="text-[#4ec38e] hover:underline font-medium"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Minimalist Copyright */}
      <footer className="max-w-7xl w-full mx-auto text-center sm:flex sm:justify-between text-[11px] text-[#6d7687]">
        <span>TangkapanKu © 2026</span>
        <span>Dilindungi Supabase Auth &amp; Row Level Security</span>
      </footer>
    </div>
  );
}
