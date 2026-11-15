"use client";

import { Suspense, useEffect, useState, use } from "react";
import Link from "next/link";

interface CreditProfileResponse {
  fisherman: {
    id: string;
    name: string;
    phone: string | null;
    boat_name: string | null;
  };
  balance: {
    total_catch_value: number;
    total_advance: number;
    total_repayment: number;
    outstanding_advance: number;
  };
  creditProfile: {
    score: number;
    narrative: string | null;
    computed_at: string;
    factors: {
      consistency: number;
      advance_ratio: number;
      repayment_history: number;
      active_duration: number;
      details?: {
        active_weeks?: number;
        catch_count?: number;
        advance_to_catch_pct?: number;
        repayment_pct?: number;
        active_days?: number;
      };
    };
  };
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

function CreditProfileContent({
  params,
}: {
  params: Promise<{ fishermanId: string }>;
}) {
  const { fishermanId } = use(params);
  const [data, setData] = useState<CreditProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [toast, setToast] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    const res = await fetch(`/api/credit/${fishermanId}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [fishermanId]);

  const handleRecompute = async () => {
    setRecomputing(true);
    setToast("");

    const res = await fetch(`/api/credit/${fishermanId}`, {
      method: "POST",
    });

    const json = await res.json();
    setRecomputing(false);

    if (!res.ok) {
      alert(json.error || "Gagal menghitung ulang skor");
      return;
    }

    setData((prev) =>
      prev ? { ...prev, creditProfile: json.creditProfile } : prev,
    );
    setToast(
      "Skor dan analisis AI berhasil diperbarui dari transaksi terbaru!",
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        Memuat profil kredit nelayan...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 flex flex-col items-center justify-center gap-3">
        <p>Profil nelayan tidak ditemukan.</p>
        <Link href="/dashboard" className="text-blue-400 underline">
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const { fisherman, balance, creditProfile } = data;
  const { score, factors, narrative, computed_at } = creditProfile;
  const details = factors.details || {};

  const scoreTier =
    score >= 80
      ? {
          label: "Indikasi Sangat Baik",
          color: "text-emerald-400",
          border: "border-emerald-700/70",
          bg: "bg-emerald-950/30",
        }
      : score >= 65
        ? {
            label: "Indikasi Cukup Baik",
            color: "text-amber-400",
            border: "border-amber-700/70",
            bg: "bg-amber-950/30",
          }
        : {
            label: "Indikasi Perlu Pengawasan",
            color: "text-red-400",
            border: "border-red-700/70",
            bg: "bg-red-950/30",
          };

  const factorList = [
    {
      title: "Konsistensi Setoran",
      weight: "35%",
      value: factors.consistency ?? 0,
      subtext:
        details.catch_count !== undefined
          ? `${details.catch_count} kali setor dalam ${details.active_weeks ?? 0} minggu aktif`
          : "Frekuensi dan keteraturan setoran hasil tangkapan",
    },
    {
      title: "Rasio Kasbon terhadap Pendapatan",
      weight: "30%",
      value: factors.advance_ratio ?? 0,
      subtext:
        details.advance_to_catch_pct !== undefined
          ? `Sisa kasbon ${details.advance_to_catch_pct}% dari total nilai tangkapan`
          : "Perbandingan sisa kasbon dengan pendapatan tangkapan",
    },
    {
      title: "Riwayat Pelunasan",
      weight: "25%",
      value: factors.repayment_history ?? 0,
      subtext:
        details.repayment_pct !== undefined
          ? `${details.repayment_pct}% dari total kasbon telah dilunasi`
          : "Kedisiplinan pembayaran cicilan kasbon",
    },
    {
      title: "Lama Aktif Bertransaksi",
      weight: "10%",
      value: factors.active_duration ?? 0,
      subtext:
        details.active_days !== undefined
          ? `Aktif tercatat selama ${details.active_days} hari`
          : "Durasi keaktifan nelayan di buku kas pengepul",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-700">|</span>
            <div>
              <h1 className="text-lg font-bold text-white">
                Profil Kredit Nelayan
              </h1>
              <p className="text-xs text-slate-400">
                {fisherman.name}{" "}
                {fisherman.boat_name ? `• Kapal ${fisherman.boat_name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/fishermen/${fisherman.id}`}
              className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Riwayat Buku Kas
            </Link>
            <button
              onClick={handleRecompute}
              disabled={recomputing}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-50"
            >
              {recomputing ? "Menghitung Ulang..." : "↻ Hitung Ulang Skor"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {toast && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between">
            <span>✓ {toast}</span>
            <button onClick={() => setToast("")} className="text-xs underline">
              Tutup
            </button>
          </div>
        )}

        {/* Banner Disclaimer Indikasi */}
        <div className="bg-slate-900/70 border border-slate-800 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            ℹ️ Skor ini merupakan{" "}
            <strong className="text-slate-200">
              indikasi kelayakan kredit
            </strong>{" "}
            berbasis histori operasional buku kas digital, bukan keputusan
            kredit final bank/LKM.
          </span>
          <span>
            Diperbarui:{" "}
            {new Date(computed_at).toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Kartu Utama: Skor & Narasi AI */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Skor Card */}
          <div
            className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center space-y-3 ${scoreTier.bg} ${scoreTier.border}`}
          >
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-950/80 border border-slate-800 text-slate-300">
              Indikasi Skor Kredit
            </span>

            <div className="py-2">
              <span
                className={`text-6xl font-extrabold tracking-tight ${scoreTier.color}`}
              >
                {score}
              </span>
              <span className="text-xl text-slate-400 font-medium"> / 100</span>
            </div>

            <p className={`text-sm font-semibold ${scoreTier.color}`}>
              {scoreTier.label}
            </p>
          </div>

          {/* Narasi AI & Ringkasan Finansial */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                  Analisis Ringkas AI
                </h2>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                {narrative || "Belum ada narasi analisis."}
              </p>
            </div>

            {/* 3 Angka Kunci Buku Kas */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
                <p className="text-xs text-slate-400">Total Setoran Ikan</p>
                <p className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
                  {formatRupiah(balance.total_catch_value)}
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
                <p className="text-xs text-slate-400">Total Pelunasan</p>
                <p className="text-sm sm:text-base font-bold text-sky-400 mt-0.5">
                  {formatRupiah(balance.total_repayment)}
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
                <p className="text-xs text-slate-400">Sisa Kasbon</p>
                <p className="text-sm sm:text-base font-bold text-amber-400 mt-0.5">
                  {formatRupiah(balance.outstanding_advance)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Breakdown Faktor Transparan */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-white">
              Rincian Faktor Penilaian (Transparan)
            </h2>
            <p className="text-xs text-slate-400">
              Dihitung secara deterministik dari catatan transaksi aktual
              nelayan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factorList.map((f) => (
              <div
                key={f.title}
                className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {f.title}
                    </p>
                    <p className="text-xs text-slate-400">{f.subtext}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">
                      {f.value}
                    </span>
                    <span className="text-xs text-slate-500">/100</span>
                    <p className="text-[11px] text-indigo-400 font-medium">
                      Bobot {f.weight}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      f.value >= 80
                        ? "bg-emerald-500"
                        : f.value >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, f.value))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CreditProfilePage({
  params,
}: {
  params: Promise<{ fishermanId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
          Memuat profil kredit nelayan...
        </div>
      }
    >
      <CreditProfileContent params={params} />
    </Suspense>
  );
}
