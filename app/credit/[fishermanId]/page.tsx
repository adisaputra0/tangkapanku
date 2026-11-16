"use client";

import { Suspense, useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";

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
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    location: string | null;
    pendingDrafts: number;
  }>({ name: "Organisasi Pengepul", location: null, pendingDrafts: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [data, setData] = useState<CreditProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [toast, setToast] = useState("");

  const fetchInitialData = async () => {
    setLoading(true);
    const [profileRes, dashRes] = await Promise.all([
      fetch(`/api/credit/${fishermanId}`),
      fetch("/api/dashboard"),
    ]);

    if (profileRes.ok) {
      const json = await profileRes.json();
      setData(json);
    }

    if (dashRes.ok) {
      const dJson = await dashRes.json();
      if (dJson.organization) {
        setOrgInfo({
          name: dJson.organization.name,
          location: dJson.organization.location,
          pendingDrafts: dJson.summary?.pending_drafts || 0,
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
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
      <div className="min-h-screen bg-[#090b0e] text-[#9aa3b2] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 rounded-full bg-[#151922] border border-[#262c3a] flex items-center justify-center p-3">
          <Image
            src="/images/logo.png"
            alt="Logo TangkapanKu"
            width={80}
            height={80}
            className="object-contain"
          />
        </div>
        <p className="text-xs font-mono uppercase tracking-[0.22em] text-[#8b94a5]">
          Memuat Profil Kredit Nelayan...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#090b0e] text-[#ececec] flex flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-3xl bg-[#11141b] border border-[#1e232e] p-8 max-w-md w-full text-center space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#f28b96]">
            DATA TIDAK DITEMUKAN
          </span>
          <p className="text-sm text-[#cfd5df]">
            Profil kredit nelayan tidak ditemukan atau belum tersedia.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#158052] hover:bg-[#19935f] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] font-semibold transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
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
          color: "text-[#4ec38e]",
          border: "border-[#22382e]",
          bg: "bg-[#101c17]",
        }
      : score >= 65
        ? {
            label: "Indikasi Cukup Baik",
            color: "text-[#d9a05b]",
            border: "border-[#3d311e]",
            bg: "bg-[#261f14]",
          }
        : {
            label: "Indikasi Perlu Pengawasan",
            color: "text-[#f28b96]",
            border: "border-[#4a2026]",
            bg: "bg-[#241316]",
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
    <div className="min-h-screen bg-[#090b0e] text-[#ececec]">
      {/* Reusable Sidebar */}
      <Sidebar
        orgName={orgInfo.name}
        orgLocation={orgInfo.location}
        pendingDrafts={orgInfo.pendingDrafts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#090b0e] border-b border-[#1e232e] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-9 h-9 rounded-xl bg-[#11141b] border border-[#1e232e] flex flex-col items-center justify-center gap-1.5"
              aria-label="Buka Sidebar"
            >
              <span className="w-4 h-[1.5px] bg-[#ececec] rounded" />
              <span className="w-3 h-[1.5px] bg-[#4ec38e] rounded" />
              <span className="w-4 h-[1.5px] bg-[#ececec] rounded" />
            </button>
            <div>
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#4ec38e] uppercase block">
                PROFIL KREDIT
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[160px] block">
                {fisherman.name}
              </span>
            </div>
          </div>

          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="px-3.5 py-2 rounded-full bg-[#158052] text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {recomputing ? "Proses..." : "↻ Hitung"}
          </button>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {/* Editorial Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href="/dashboard"
                  className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8b94a5] hover:text-white transition-colors"
                >
                  &larr; Ringkasan
                </Link>
                <span className="text-[#262c3a]">/</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#4ec38e]">
                  ANALISIS KELAYAKAN KREDIT
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Profil Kredit{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  {fisherman.name}
                </span>
              </h1>
              {fisherman.boat_name && (
                <p className="text-xs text-[#8b94a5] mt-1 font-mono">
                  Armada: {fisherman.boat_name}
                  {fisherman.phone ? ` • Kontak: ${fisherman.phone}` : ""}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRecompute}
                disabled={recomputing}
                className="px-5 py-2.5 text-xs uppercase tracking-[0.16em] font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors disabled:opacity-50"
              >
                {recomputing ? "Menghitung Ulang..." : "↻ Hitung Ulang Skor"}
              </button>
            </div>
          </div>

          {/* Success Toast */}
          {toast && (
            <div className="p-4 rounded-2xl bg-[#101c17] border border-[#22382e] text-[#4ec38e] text-xs sm:text-sm flex items-center justify-between gap-4">
              <span>✓ {toast}</span>
              <button
                onClick={() => setToast("")}
                className="text-xs font-mono uppercase tracking-wider text-[#8ba398] hover:text-white"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Banner Disclaimer Indikasi */}
          <div className="bg-[#11141b] border border-[#1e232e] px-5 py-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-[#8b94a5]">
            <span className="leading-relaxed">
              Skor ini merupakan{" "}
              <strong className="text-white font-medium">
                indikasi kelayakan kredit
              </strong>{" "}
              berbasis histori operasional buku kas digital, bukan keputusan
              kredit final lembaga keuangan.
            </span>
            <span className="font-mono text-[11px] text-[#6d7687] shrink-0">
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
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Skor Card */}
            <div
              className={`rounded-[28px] border p-7 flex flex-col items-center justify-center text-center space-y-4 ${scoreTier.bg} ${scoreTier.border}`}
            >
              <span className="px-3.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-[0.2em] bg-[#090b0e] border border-[#1e232e] text-[#9aa3b2]">
                Indikasi Skor Kredit
              </span>

              <div className="py-2">
                <span
                  className={`font-mono text-6xl font-bold tracking-tight tabular-nums ${scoreTier.color}`}
                >
                  {score}
                </span>
                <span className="font-mono text-lg text-[#6d7687] font-medium">
                  {" "}
                  / 100
                </span>
              </div>

              <p className={`text-sm font-semibold ${scoreTier.color}`}>
                {scoreTier.label}
              </p>
            </div>

            {/* Narasi AI & Ringkasan Finansial */}
            <div className="lg:col-span-2 bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block">
                  EVALUASI NARATIF AI
                </span>
                <h2 className="text-lg font-semibold text-white">
                  Analisis Ringkas Kelayakan
                </h2>
                <p className="text-xs sm:text-sm text-[#cfd5df] leading-relaxed font-light bg-[#090b0e] border border-[#1e232e] p-4 sm:p-5 rounded-2xl">
                  {narrative || "Belum ada narasi analisis."}
                </p>
              </div>

              {/* 3 Angka Kunci Buku Kas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-[#090b0e] border border-[#1e232e] p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a5]">
                    Total Setoran Ikan
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold text-[#4ec38e] mt-1.5 tabular-nums">
                    {formatRupiah(balance.total_catch_value)}
                  </p>
                </div>
                <div className="bg-[#090b0e] border border-[#1e232e] p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a5]">
                    Total Pelunasan
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold text-[#64a6bd] mt-1.5 tabular-nums">
                    {formatRupiah(balance.total_repayment)}
                  </p>
                </div>
                <div className="bg-[#090b0e] border border-[#1e232e] p-4 rounded-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a5]">
                    Sisa Kasbon
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold text-[#d9a05b] mt-1.5 tabular-nums">
                    {formatRupiah(balance.outstanding_advance)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Breakdown Faktor Transparan */}
          <section className="bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block mb-1">
                PARAMETER DETERMINISTIK
              </span>
              <h2 className="text-lg font-semibold text-white">
                Rincian Faktor Penilaian
              </h2>
              <p className="text-xs text-[#8b94a5] mt-0.5">
                Dihitung secara transparan dari catatan transaksi aktual nelayan
                di buku kas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {factorList.map((f) => (
                <div
                  key={f.title}
                  className="bg-[#090b0e] border border-[#1e232e] p-5 rounded-2xl space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {f.title}
                      </p>
                      <p className="text-xs text-[#8b94a5] mt-1 leading-relaxed">
                        {f.subtext}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-lg font-bold text-white tabular-nums">
                        {f.value}
                      </span>
                      <span className="font-mono text-xs text-[#6d7687]">
                        /100
                      </span>
                      <p className="text-[10px] font-mono text-[#4ec38e] mt-0.5">
                        Bobot {f.weight}
                      </p>
                    </div>
                  </div>

                  {/* Solid Progress Bar */}
                  <div className="w-full h-2 bg-[#151922] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        f.value >= 80
                          ? "bg-[#158052]"
                          : f.value >= 60
                            ? "bg-[#d9a05b]"
                            : "bg-[#c95b67]"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, f.value))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
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
        <div className="min-h-screen bg-[#090b0e] text-[#9aa3b2] flex items-center justify-center text-xs font-mono uppercase tracking-[0.22em]">
          Memuat profil kredit nelayan...
        </div>
      }
    >
      <CreditProfileContent params={params} />
    </Suspense>
  );
}
