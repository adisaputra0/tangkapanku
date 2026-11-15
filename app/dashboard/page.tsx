"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
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
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center">
        Memuat data operasional pengepul...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-red-400 flex flex-col items-center justify-center gap-4">
        <p>{error || "Data tidak tersedia"}</p>
        <Link href="/login" className="text-blue-400 underline">
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-400">
                TangkapanKu
              </span>
              <span className="text-slate-600">|</span>
              <h1 className="font-semibold text-white">
                {data.organization.name}
              </h1>
            </div>
            {data.organization.location && (
              <p className="text-xs text-slate-400">
                {data.organization.location}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ai-input"
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              + Input Pintar AI
              {data.summary.pending_drafts > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-400 text-slate-950 font-bold rounded-full">
                  {data.summary.pending_drafts}
                </span>
              )}
            </Link>
            <Link
              href="/fishermen"
              className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Nelayan
            </Link>
            <Link
              href="/transactions"
              className="px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Buku Kas
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Total Nilai Tangkapan
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {formatRupiah(data.summary.total_catch_value)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Kasbon Beredar
            </p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {formatRupiah(data.summary.outstanding_advance)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Lunas: {formatRupiah(data.summary.total_repayment)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Nelayan Aktif
            </p>
            <p className="text-2xl font-bold text-white mt-1">
              {data.summary.active_fishermen}{" "}
              <span className="text-sm font-normal text-slate-400">orang</span>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Draf AI Pending
            </p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {data.summary.pending_drafts}{" "}
              <span className="text-sm font-normal text-slate-400">draf</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Menunggu konfirmasi buku kas
            </p>
          </div>
        </section>

        {/* Chart & Laporan Malam / Anomali */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grafik Tren Harga */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">
                  Tren Harga per Jenis Ikan
                </h2>
                <p className="text-xs text-slate-400">
                  Pergerakan harga beli per kg dari catatan tangkapan
                </p>
              </div>
            </div>
            <PriceTrendChart data={data.priceTrends} />
          </div>

          {/* Laporan Malam & Deteksi Anomali */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">
                  Laporan Malam & Anomali
                </h2>
                {data.latestReport && (
                  <span className="text-xs text-slate-400">
                    {data.latestReport.report_date}
                  </span>
                )}
              </div>

              {data.latestReport ? (
                <p className="text-sm text-slate-300 bg-slate-800/70 p-3 rounded-lg border border-slate-700/70 leading-relaxed">
                  {data.latestReport.narrative}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Belum ada laporan harian otomatis.
                </p>
              )}

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-400 uppercase">
                  Deteksi Anomali
                </p>
                {data.anomalies.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Tidak ada anomali terdeteksi.
                  </p>
                ) : (
                  data.anomalies.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-medium text-red-400">
                        <span>
                          {item.kind === "advance_spike"
                            ? "Lonjakan Kasbon"
                            : "Penurunan Harga"}
                        </span>
                        <span>Level {item.severity}</span>
                      </div>
                      <p className="text-slate-300">{item.detail?.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link
              href="/reports"
              className="text-xs text-blue-400 hover:underline text-right block pt-2"
            >
              Lihat semua laporan malam →
            </Link>
          </div>
        </section>

        {/* Tabel Ringkasan Saldo & Skor Kredit Nelayan */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Saldo & Profil Kredit Nelayan
              </h2>
              <p className="text-xs text-slate-400">
                Klik nama nelayan untuk melihat detail analisis kredit AI
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3">Nama Nelayan</th>
                  <th className="px-5 py-3">Total Setoran Ikan</th>
                  <th className="px-5 py-3">Sisa Kasbon</th>
                  <th className="px-5 py-3">Indikasi Skor Kredit</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.fishermen.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-6 text-center text-slate-500"
                    >
                      Belum ada data nelayan. Tambahkan nelayan terlebih dahulu.
                    </td>
                  </tr>
                ) : (
                  data.fishermen.map((f) => (
                    <tr
                      key={f.fisherman_id}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-3.5 font-medium text-white">
                        {f.name}
                      </td>
                      <td className="px-5 py-3.5 text-emerald-400">
                        {formatRupiah(Number(f.total_catch_value))}
                      </td>
                      <td className="px-5 py-3.5 text-amber-400">
                        {formatRupiah(Number(f.outstanding_advance))}
                      </td>
                      <td className="px-5 py-3.5">
                        {f.credit_score !== null ? (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              f.credit_score >= 80
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : f.credit_score >= 65
                                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                                  : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {f.credit_score} / 100
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Belum dihitung
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/credit/${f.fisherman_id}`}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          Profil Kredit →
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
  );
}
