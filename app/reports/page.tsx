"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DailyReport {
  id: string;
  report_date: string;
  narrative: string | null;
  model: string | null;
  metrics: {
    total_kg?: number;
    total_value?: number;
    advance_issued?: number;
    repayment_received?: number;
    top_species?: string | null;
    avg_price?: Record<string, number>;
  };
}

interface Anomaly {
  id: string;
  report_date: string;
  kind: string;
  severity: number;
  detail: { message?: string };
  fishermen?: { name: string } | null;
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    const res = await fetch("/api/reports");
    if (res.ok) {
      const json = await res.json();
      setReports(json.reports || []);
      setAnomalies(json.anomalies || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateNow = async () => {
    setGenerating(true);
    setToast("");

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      alert(data.error || "Gagal membuat laporan");
      return;
    }

    setToast(data.message || "Laporan berhasil dibuat!");
    fetchReports();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
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
                Laporan Malam Otomatis
              </h1>
              <p className="text-xs text-slate-400">
                Dijadwalkan setiap hari pukul 21:00 WIB
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateNow}
            disabled={generating}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50"
          >
            {generating
              ? "Menghitung & Menyusun Narasi..."
              : "⚡ Buat laporan sekarang"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {toast && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between">
            <span>✓ {toast}</span>
            <button onClick={() => setToast("")} className="text-xs underline">
              Tutup
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-500">
            Memuat arsip laporan malam...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <p className="text-slate-400 text-sm">
              Belum ada laporan harian yang tersimpan.
            </p>
            <button
              onClick={handleGenerateNow}
              disabled={generating}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
            >
              Buat laporan sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map((report) => {
              const dayAnomalies = anomalies.filter(
                (a) => a.report_date === report.report_date,
              );
              const avgPrices = report.metrics?.avg_price || {};

              return (
                <article
                  key={report.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
                >
                  {/* Header Tanggal & Model */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                        Ringkasan Operasional
                      </span>
                      <h2 className="text-xl font-bold text-white mt-0.5">
                        {new Date(
                          `${report.report_date}T00:00:00`,
                        ).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </h2>
                    </div>

                    {report.model && (
                      <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                        AI: {report.model}
                      </span>
                    )}
                  </div>

                  {/* Narasi AI */}
                  <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-xl">
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {report.narrative || "Tidak ada ringkasan narasi."}
                    </p>
                  </div>

                  {/* Grid Metrik Harian */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 border border-slate-800 p-3.5 rounded-xl">
                      <p className="text-xs text-slate-400">Total Berat Ikan</p>
                      <p className="text-lg font-bold text-white mt-0.5">
                        {report.metrics?.total_kg ?? 0} kg
                      </p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-800 p-3.5 rounded-xl">
                      <p className="text-xs text-slate-400">Nilai Tangkapan</p>
                      <p className="text-lg font-bold text-emerald-400 mt-0.5">
                        {formatRupiah(Number(report.metrics?.total_value || 0))}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-800 p-3.5 rounded-xl">
                      <p className="text-xs text-slate-400">Kasbon Keluar</p>
                      <p className="text-lg font-bold text-amber-400 mt-0.5">
                        {formatRupiah(
                          Number(report.metrics?.advance_issued || 0),
                        )}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 border border-slate-800 p-3.5 rounded-xl">
                      <p className="text-xs text-slate-400">Ikan Terbanyak</p>
                      <p className="text-lg font-bold text-sky-400 mt-0.5">
                        {report.metrics?.top_species || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Rata-rata Harga per Jenis Ikan */}
                  {Object.keys(avgPrices).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                        Rata-rata Harga Beli per Jenis Ikan
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(avgPrices).map(([species, price]) => (
                          <span
                            key={species}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                          >
                            <strong className="text-white">{species}:</strong>{" "}
                            {formatRupiah(Number(price))}/kg
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anomali Terdeteksi */}
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Deteksi Anomali ({dayAnomalies.length})
                    </p>

                    {dayAnomalies.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Tidak ada anomali harga maupun kasbon pada tanggal ini.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dayAnomalies.map((anom) => (
                          <div
                            key={anom.id}
                            className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/60 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-red-400">
                              <span>
                                {anom.kind === "price_drop"
                                  ? "📉 Penurunan Harga Ikan"
                                  : anom.kind === "advance_spike"
                                    ? "⚠️ Lonjakan Kasbon Nelayan"
                                    : "📦 Outlier Berat Setoran"}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800">
                                Severity {anom.severity}/3
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {anom.detail?.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
