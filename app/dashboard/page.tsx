"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import PriceTrendChart from "@/components/PriceTrendChart";

interface DashboardData {
  organization: { id: string; name: string; location: string | null };
  summary: {
    total_catch_value: number;
    total_advance: number;
    total_repayment: number;
    outstanding_advance: number;
    active_fishermen: number;
    pending_drafts: number;
  };
  fishermen: {
    fisherman_id: string;
    name: string;
    total_catch_value: number;
    outstanding_advance: number;
    credit_score: number | null;
  }[];
  priceTrends: Record<string, any>[];
  latestReport: {
    report_date: string;
    narrative: string;
    metrics: any;
  } | null;
  anomalies: {
    id: string;
    kind: string;
    severity: number;
    detail: { message?: string };
    fishermen?: { name: string } | null;
  }[];
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat data dashboard");
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
          Memuat Buku Kas Pengepul...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090b0e] text-[#ececec] flex flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-3xl bg-[#11141b] border border-[#1e232e] p-8 max-w-md w-full text-center space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#f28b96]">
            KENDALA KONEKSI
          </span>
          <p className="text-sm text-[#cfd5df]">
            {error || "Data operasional tidak tersedia saat ini."}
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#158052] hover:bg-[#19935f] text-white px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] font-semibold transition-colors"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#ececec]">
      {/* Sidebar Navigation */}
      <Sidebar
        orgName={data.organization.name}
        orgLocation={data.organization.location}
        pendingDrafts={data.summary.pending_drafts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Wrapper (Offset by Sidebar Width on Desktop) */}
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
                TANGKAPANKU
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[160px] block">
                {data.organization.name}
              </span>
            </div>
          </div>

          <Link
            href="/ai-input"
            className="px-3.5 py-2 rounded-full bg-[#158052] text-white text-[11px] font-bold uppercase tracking-wider"
          >
            + Input AI
          </Link>
        </header>

        {/* Dashboard Main Area */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {/* Editorial Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#4ec38e] block mb-1.5">
                RINGKASAN OPERASIONAL
              </span>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Ikhtisar{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  Buku Kas
                </span>{" "}
                &amp; Saldo Nelayan
              </h1>
            </div>
            <span className="text-xs font-mono text-[#6d7687]">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Total Nilai Tangkapan */}
            <div className="bg-[#101c17] border border-[#22382e] p-6 rounded-[24px] flex flex-col justify-between">
              <p className="text-[10px] font-bold text-[#4ec38e] uppercase tracking-[0.2em]">
                Total Nilai Tangkapan
              </p>
              <p className="font-mono text-xl xl:text-2xl font-bold text-white mt-3 tabular-nums">
                {formatRupiah(data.summary.total_catch_value)}
              </p>
              <p className="text-[11px] text-[#8ba398] mt-2">
                Akumulasi setoran terkonfirmasi
              </p>
            </div>

            {/* Kasbon Beredar */}
            <div className="bg-[#11141b] border border-[#1e232e] p-6 rounded-[24px] flex flex-col justify-between">
              <p className="text-[10px] font-bold text-[#8b94a5] uppercase tracking-[0.2em]">
                Kasbon Beredar
              </p>
              <p className="font-mono text-xl xl:text-2xl font-bold text-[#d9a05b] mt-3 tabular-nums">
                {formatRupiah(data.summary.outstanding_advance)}
              </p>
              <p className="text-[11px] text-[#8b94a5] mt-2 font-mono">
                Lunas: {formatRupiah(data.summary.total_repayment)}
              </p>
            </div>

            {/* Nelayan Aktif */}
            <div className="bg-[#11141b] border border-[#1e232e] p-6 rounded-[24px] flex flex-col justify-between">
              <p className="text-[10px] font-bold text-[#8b94a5] uppercase tracking-[0.2em]">
                Nelayan Aktif
              </p>
              <p className="font-mono text-xl xl:text-2xl font-bold text-white mt-3 tabular-nums">
                {data.summary.active_fishermen}{" "}
                <span className="font-sans text-xs font-normal text-[#8b94a5]">
                  nelayan
                </span>
              </p>
              <p className="text-[11px] text-[#8b94a5] mt-2">
                Terdaftar dalam organisasi
              </p>
            </div>

            {/* Draf AI Pending */}
            <div className="bg-[#11141b] border border-[#1e232e] p-6 rounded-[24px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#8b94a5] uppercase tracking-[0.2em]">
                  Draf AI Pending
                </p>
                {data.summary.pending_drafts > 0 && (
                  <span className="h-2 w-2 rounded-full bg-[#d9a05b]" />
                )}
              </div>
              <p className="font-mono text-xl xl:text-2xl font-bold text-[#64a6bd] mt-3 tabular-nums">
                {data.summary.pending_drafts}{" "}
                <span className="font-sans text-xs font-normal text-[#8b94a5]">
                  draf
                </span>
              </p>
              <Link
                href="/ai-input"
                className="text-[11px] text-[#4ec38e] hover:underline mt-2 inline-block"
              >
                Periksa konfirmasi &rarr;
              </Link>
            </div>
          </section>

          {/* Chart & Laporan Malam / Anomali */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Grafik Tren Harga */}
            <div className="xl:col-span-2 bg-[#11141b] border border-[#1e232e] p-6 sm:p-7 rounded-[28px]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block mb-1">
                    ANALITIK KOMODITAS
                  </span>
                  <h2 className="text-lg font-semibold text-white">
                    Tren Harga per Jenis Ikan
                  </h2>
                  <p className="text-xs text-[#8b94a5] mt-0.5">
                    Pergerakan harga beli per kg dari catatan tangkapan
                  </p>
                </div>
              </div>
              <PriceTrendChart data={data.priceTrends} />
            </div>

            {/* Laporan Malam & Deteksi Anomali */}
            <div className="bg-[#11141b] border border-[#1e232e] p-6 sm:p-7 rounded-[28px] flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block mb-1">
                      CRON 21:00 WIB
                    </span>
                    <h2 className="text-lg font-semibold text-white">
                      Laporan Malam &amp; Anomali
                    </h2>
                  </div>
                  {data.latestReport && (
                    <span className="px-2.5 py-1 rounded-full bg-[#151922] border border-[#262c3a] font-mono text-[10px] text-[#9aa3b2]">
                      {data.latestReport.report_date}
                    </span>
                  )}
                </div>

                {data.latestReport ? (
                  <p className="text-xs sm:text-sm text-[#cfd5df] bg-[#090b0e] p-4 rounded-2xl border border-[#1e232e] leading-relaxed font-light">
                    {data.latestReport.narrative}
                  </p>
                ) : (
                  <div className="bg-[#090b0e] p-4 rounded-2xl border border-[#1e232e]">
                    <p className="text-xs text-[#6d7687]">
                      Belum ada laporan harian otomatis yang diterbitkan.
                    </p>
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <p className="text-[10px] font-bold text-[#8b94a5] uppercase tracking-[0.2em]">
                    Deteksi Anomali Statistik
                  </p>
                  {data.anomalies.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-[#101c17] border border-[#22382e] text-xs text-[#4ec38e]">
                      Tidak ada anomali harga atau kasbon terdeteksi.
                    </div>
                  ) : (
                    data.anomalies.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-[#241316] border border-[#4a2026] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-semibold text-[#f28b96]">
                          <span>
                            {item.kind === "advance_spike"
                              ? "Lonjakan Kasbon"
                              : "Penurunan Harga"}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#36181d]">
                            Level {item.severity}
                          </span>
                        </div>
                        <p className="text-[#e0c3c7] leading-relaxed">
                          {item.detail?.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#1e232e] flex justify-end">
                <Link
                  href="/reports"
                  className="text-xs font-mono text-[#4ec38e] hover:underline"
                >
                  Lihat semua laporan malam &rarr;
                </Link>
              </div>
            </div>
          </section>

          {/* Tabel Ringkasan Saldo & Skor Kredit Nelayan */}
          <section className="bg-[#11141b] border border-[#1e232e] rounded-[28px] overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-[#1e232e] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block mb-1">
                  PROFIL KELAYAKAN KREDIT
                </span>
                <h2 className="text-lg font-semibold text-white">
                  Saldo &amp; Skor Kredit Nelayan
                </h2>
                <p className="text-xs text-[#8b94a5] mt-0.5">
                  Klik profil kredit untuk melihat detail evaluasi dan riwayat
                  transaksi nelayan
                </p>
              </div>
              <Link
                href="/fishermen"
                className="text-xs font-mono text-[#9aa3b2] hover:text-white transition-colors"
              >
                Kelola Daftar Nelayan &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0d1017] text-[#8b94a5] text-[10px] font-bold uppercase tracking-[0.2em] border-b border-[#1e232e]">
                  <tr>
                    <th className="px-6 py-4">Nama Nelayan</th>
                    <th className="px-6 py-4">Total Setoran Ikan</th>
                    <th className="px-6 py-4">Sisa Kasbon</th>
                    <th className="px-6 py-4">Indikasi Skor Kredit</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232e]">
                  {data.fishermen.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-xs text-[#6d7687]"
                      >
                        Belum ada data nelayan. Tambahkan nelayan terlebih
                        dahulu untuk memulai pencatatan.
                      </td>
                    </tr>
                  ) : (
                    data.fishermen.map((f) => (
                      <tr
                        key={f.fisherman_id}
                        className="hover:bg-[#151922] transition-colors"
                      >
                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                          <Link
                            href={`/fishermen/${f.fisherman_id}`}
                            className="text-white hover:text-[#4ec38e] transition-colors"
                          >
                            {f.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs sm:text-sm text-[#4ec38e] tabular-nums whitespace-nowrap">
                          {formatRupiah(Number(f.total_catch_value))}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs sm:text-sm text-[#d9a05b] tabular-nums whitespace-nowrap">
                          {formatRupiah(Number(f.outstanding_advance))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {f.credit_score !== null ? (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full font-mono text-xs font-semibold ${
                                f.credit_score >= 80
                                  ? "bg-[#101c17] text-[#4ec38e] border border-[#22382e]"
                                  : f.credit_score >= 65
                                    ? "bg-[#261f14] text-[#d9a05b] border border-[#3d311e]"
                                    : "bg-[#241316] text-[#f28b96] border border-[#4a2026]"
                              }`}
                            >
                              {f.credit_score} / 100
                            </span>
                          ) : (
                            <span className="text-xs text-[#6d7687] font-mono">
                              Belum dihitung
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Link
                            href={`/credit/${f.fisherman_id}`}
                            className="inline-flex items-center px-3.5 py-1.5 rounded-full border border-[#262c3a] bg-[#090b0e] hover:bg-[#158052] hover:border-[#158052] text-xs text-[#cfd5df] hover:text-white transition-colors"
                          >
                            Profil Kredit &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
