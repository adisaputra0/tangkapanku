"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login gagal");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-xl space-y-4"
      >
        <h1 className="text-xl font-bold text-white">Masuk ke TangkapanKu</h1>

        {error && (
          <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 p-2.5 rounded-lg">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          required
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          required
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 p-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-500 transition disabled:opacity-50"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <p className="text-sm text-center text-slate-400">
          Belum punya akun?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Daftar
          </Link>
        </p>
      </form>
    </div>
  );
}
