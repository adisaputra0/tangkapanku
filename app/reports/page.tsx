"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

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
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    location: string | null;
    pendingDrafts: number;
  }>({ name: "Organisasi Pengepul", location: null, pendingDrafts: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");

  const fetchInitialData = async () => {
    setLoading(true);
    const [repRes, dashRes] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/dashboard"),
    ]);

    if (repRes.ok) {
      const json = await repRes.json();
      setReports(json.reports || []);
      setAnomalies(json.anomalies || []);
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

    setToast(data.message || "Laporan malam berhasil disusun!");
    fetchInitialData();
  };

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
                LAPORAN MALAM
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[160px] block">
                {orgInfo.name}
              </span>
            </div>
          </div>

          <button
            onClick={handleGenerateNow}
            disabled={generating}
            className="px-3.5 py-2 rounded-full bg-[#158052] text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {generating ? "Proses..." : "⚡ Buat"}
          </button>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {/* Editorial Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#4ec38e] block mb-1.5">
                CRON HARIAN • 21:00 WIB
              </span>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Laporan Malam{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  Otomatis
                </span>{" "}
                &amp; Anomali
              </h1>
            </div>

            <button
              onClick={handleGenerateNow}
              disabled={generating}
              className="px-5 py-2.5 text-xs uppercase tracking-[0.16em] font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              {generating ? "Menyusun Narasi AI..." : "Buat Laporan Sekarang"}
            </button>
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

          {/* Archive Content */}
          {loading ? (
            <div className="py-16 text-center text-xs font-mono uppercase tracking-[0.22em] text-[#6d7687]">
              Memuat arsip laporan malam...
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-[#11141b] border border-[#1e232e] rounded-[28px] p-12 text-center space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#6d7687] block">
                ARSIP KOSONG
              </span>
              <p className="text-sm text-[#9aa3b2] max-w-md mx-auto leading-relaxed">
                Belum ada laporan harian otomatis yang tersimpan untuk
                organisasi ini.
              </p>
              <button
                onClick={handleGenerateNow}
                disabled={generating}
                className="px-6 py-3 text-xs uppercase tracking-[0.18em] font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors"
              >
                Buat Laporan Pertama Sekarang
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
                    className="bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-8 space-y-6"
                  >
                    {/* Header Tanggal & Model */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1e232e] pb-5">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block mb-1">
                          RINGKASAN OPERASIONAL HARIAN
                        </span>
                        <h2 className="text-xl sm:text-2xl font-light text-white">
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
                        <span className="px-3 py-1 font-mono text-[10px] rounded-full bg-[#151922] text-[#9aa3b2] border border-[#262c3a]">
                          AI: {report.model}
                        </span>
                      )}
                    </div>

                    {/* Narasi AI */}
                    <div className="bg-[#090b0e] border border-[#1e232e] p-5 rounded-2xl">
                      <p className="text-xs sm:text-sm text-[#cfd5df] leading-relaxed font-light">
                        {report.narrative || "Tidak ada ringkasan narasi."}
                      </p>
                    </div>

                    {/* Grid Metrik Harian */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[#090b0e] border border-[#1e232e] p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a5]">
                          Total Berat Ikan
                        </p>
                        <p className="font-mono text-lg font-bold text-white mt-1.5 tabular-nums">
                          {report.metrics?.total_kg ?? 0}{" "}
                          <span className="font-sans text-xs font-normal text-[#6d7687]">
                            kg
                          </span>
                        </p>
                      </div>

                      <div className="bg-[#101c17] border border-[#22382e] p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4ec38e]">
                          Nilai Tangkapan
                        </p>
                        <p className="font-mono text-lg font-bold text-white mt-1.5 tabular-nums">
                          {formatRupiah(
                            Number(report.metrics?.total_value || 0),
                          )}
                        </p>
                      </div>

                      <div className="bg-[#090b0e] border border-[#1e232e] p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a5]">
                          Kasbon Keluar
                        </p>
                        <p className="font-mono text-lg font-bold text-[#d9a05b] mt-1.5 tabular-nums">
                          {formatRupiah(
                            Number(report.metrics?.advance_issued || 0),
                          )}
                        </p>
                      </div>

                      <div className="bg-[#090b0e] border border-[#1e232e] p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b94a5]">
                          Ikan Terbanyak
                        </p>
                        <p className="font-serif italic text-lg text-[#64a6bd] mt-1">
                          {report.metrics?.top_species || "-"}
                        </p>
                      </div>
                    </div>

                    {/* Rata-rata Harga per Jenis Ikan */}
                    {Object.keys(avgPrices).length > 0 && (
                      <div className="space-y-2.5">
                        <p className="text-[10px] font-bold text-[#8b94a5] uppercase tracking-[0.2em]">
                          Rata-Rata Harga Beli per Jenis Ikan
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(avgPrices).map(([species, price]) => (
                            <span
                              key={species}
                              className="px-3.5 py-1.5 rounded-full bg-[#151922] border border-[#262c3a] text-xs text-[#cfd5df]"
                            >
                              <strong className="text-white font-medium">
                                {species}:
                              </strong>{" "}
                              <span className="font-mono text-[#4ec38e]">
                                {formatRupiah(Number(price))}/kg
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Anomali Terdeteksi */}
                    <div className="space-y-3 pt-2 border-t border-[#1e232e]">
                      <p className="text-[10px] font-bold text-[#8b94a5] uppercase tracking-[0.2em]">
                        Deteksi Anomali Statistik ({dayAnomalies.length})
                      </p>

                      {dayAnomalies.length === 0 ? (
                        <div className="p-3.5 rounded-2xl bg-[#101c17] border border-[#22382e] text-xs text-[#4ec38e]">
                          Tidak ada anomali harga maupun kasbon yang terdeteksi
                          pada tanggal ini.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {dayAnomalies.map((anom) => (
                            <div
                              key={anom.id}
                              className="p-4 rounded-2xl bg-[#241316] border border-[#4a2026] space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs font-semibold text-[#f28b96]">
                                <span>
                                  {anom.kind === "price_drop"
                                    ? "Penurunan Harga Ikan"
                                    : anom.kind === "advance_spike"
                                      ? "Lonjakan Kasbon Nelayan"
                                      : "Outlier Berat Setoran"}
                                </span>
                                <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-[#36181d]">
                                  Severity {anom.severity}/3
                                </span>
                              </div>
                              {anom.fishermen?.name && (
                                <p className="text-xs font-medium text-[#d9a05b]">
                                  Nelayan: {anom.fishermen.name}
                                </p>
                              )}
                              <p className="text-xs text-[#e0c3c7] leading-relaxed">
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
    </div>
  );
}
