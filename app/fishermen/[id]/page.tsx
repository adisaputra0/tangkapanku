"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface FishermanDetail {
  id: string;
  name: string;
  phone: string | null;
  boat_name: string | null;
  is_active: boolean;
}

interface BalanceSummary {
  total_catch_value: number;
  total_advance: number;
  total_repayment: number;
  outstanding_advance: number;
}

interface TransactionItem {
  id: string;
  type: "catch" | "advance" | "repayment";
  species: string | null;
  weight_kg: number | null;
  price_per_kg: number | null;
  amount: number;
  note: string | null;
  occurred_at: string;
  source: string;
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

function FishermanDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    location: string | null;
    pendingDrafts: number;
  }>({ name: "Organisasi Pengepul", location: null, pendingDrafts: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [fisherman, setFisherman] = useState<FishermanDetail | null>(null);
  const [balance, setBalance] = useState<BalanceSummary>({
    total_catch_value: 0,
    total_advance: 0,
    total_repayment: 0,
    outstanding_advance: 0,
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [detailRes, txnRes, dashRes] = await Promise.all([
        fetch(`/api/credit/${id}`),
        fetch(`/api/transactions?fisherman_id=${id}`),
        fetch("/api/dashboard"),
      ]);

      if (detailRes.ok) {
        const dJson = await detailRes.json();
        setFisherman(dJson.fisherman);
        if (dJson.balance) setBalance(dJson.balance);
      }

      if (txnRes.ok) {
        const tJson = await txnRes.json();
        setTransactions(tJson.transactions || []);
      }

      if (dashRes.ok) {
        const dashJson = await dashRes.json();
        if (dashJson.organization) {
          setOrgInfo({
            name: dashJson.organization.name,
            location: dashJson.organization.location,
            pendingDrafts: dashJson.summary?.pending_drafts || 0,
          });
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#ececec]">
      <Sidebar
        orgName={orgInfo.name}
        orgLocation={orgInfo.location}
        pendingDrafts={orgInfo.pendingDrafts}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#090b0e] border-b border-[#1e232e] px-5 py-3.5 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-[#11141b] border border-[#1e232e] flex flex-col items-center justify-center gap-1.5"
            aria-label="Buka Sidebar"
          >
            <span className="w-4 h-[1.5px] bg-[#ececec] rounded" />
            <span className="w-3 h-[1.5px] bg-[#4ec38e] rounded" />
            <span className="w-4 h-[1.5px] bg-[#ececec] rounded" />
          </button>
          <span className="text-xs font-bold tracking-[0.2em] text-[#4ec38e] uppercase">
            BUKU KAS NELAYAN
          </span>
          <Link href="/fishermen" className="text-xs text-[#9aa3b2]">
            Kembali
          </Link>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {loading ? (
            <div className="py-20 text-center text-xs font-mono uppercase tracking-widest text-[#6d7687]">
              Memuat buku kas nelayan...
            </div>
          ) : !fisherman ? (
            <div className="py-20 text-center space-y-3">
              <p className="text-sm text-[#f28b96]">
                Data nelayan tidak ditemukan.
              </p>
              <Link
                href="/fishermen"
                className="inline-block text-xs text-[#4ec38e] underline"
              >
                ← Kembali ke Daftar Nelayan
              </Link>
            </div>
          ) : (
            <>
              {/* Header Profil */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
                <div>
                  <Link
                    href="/fishermen"
                    className="text-xs text-[#8b94a5] hover:text-white transition-colors inline-block mb-3"
                  >
                    ← Daftar Nelayan
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                    {fisherman.name}
                  </h1>
                  <p className="text-xs text-[#8b94a5] mt-1 font-mono">
                    {fisherman.boat_name
                      ? `Kapal: ${fisherman.boat_name}`
                      : "Tanpa keterangan kapal"}{" "}
                    • Kontak: {fisherman.phone || "-"}
                  </p>
                </div>

                <Link
                  href={`/credit/${fisherman.id}`}
                  className="px-5 py-2.5 text-xs uppercase tracking-[0.16em] font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors self-start sm:self-auto"
                >
                  Lihat Skor Kredit →
                </Link>
              </div>

              {/* 4 Kartu Ringkasan Saldo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#11141b] border border-[#1e232e] p-5 rounded-[24px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b94a5]">
                    Total Nilai Tangkapan
                  </span>
                  <p className="text-xl font-bold font-mono text-[#4ec38e] mt-2">
                    {formatRupiah(balance.total_catch_value)}
                  </p>
                </div>

                <div className="bg-[#11141b] border border-[#1e232e] p-5 rounded-[24px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b94a5]">
                    Total Kasbon Diambil
                  </span>
                  <p className="text-xl font-bold font-mono text-white mt-2">
                    {formatRupiah(balance.total_advance)}
                  </p>
                </div>

                <div className="bg-[#11141b] border border-[#1e232e] p-5 rounded-[24px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b94a5]">
                    Total Pelunasan
                  </span>
                  <p className="text-xl font-bold font-mono text-sky-400 mt-2">
                    {formatRupiah(balance.total_repayment)}
                  </p>
                </div>

                <div className="bg-[#11141b] border border-[#22382e] p-5 rounded-[24px]">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#d9a05b]">
                    Sisa Kasbon Beredar
                  </span>
                  <p className="text-xl font-bold font-mono text-[#d9a05b] mt-2">
                    {formatRupiah(balance.outstanding_advance)}
                  </p>
                </div>
              </div>

              {/* Tabel Riwayat Transaksi Nelayan */}
              <div className="bg-[#11141b] border border-[#1e232e] rounded-[28px] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1e232e] flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    Riwayat Buku Kas ({transactions.length} Transaksi)
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#0d1017] text-[#8b94a5] text-[10px] font-bold uppercase tracking-[0.2em] border-b border-[#1e232e]">
                      <tr>
                        <th className="px-6 py-4">Tanggal</th>
                        <th className="px-6 py-4">Jenis</th>
                        <th className="px-6 py-4">Detail</th>
                        <th className="px-6 py-4">Sumber</th>
                        <th className="px-6 py-4 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e232e]">
                      {transactions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-xs text-[#6d7687]"
                          >
                            Belum ada transaksi tercatat untuk nelayan ini.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-[#151922]">
                            <td className="px-6 py-4 font-mono text-xs text-[#9aa3b2] whitespace-nowrap">
                              {new Date(t.occurred_at).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                                  t.type === "catch"
                                    ? "bg-[#101c17] text-[#4ec38e] border border-[#22382e]"
                                    : t.type === "advance"
                                      ? "bg-[#261f14] text-[#d9a05b] border border-[#3d311e]"
                                      : "bg-sky-950/50 text-sky-300 border border-sky-800/60"
                                }`}
                              >
                                {t.type === "catch"
                                  ? "Setoran Ikan"
                                  : t.type === "advance"
                                    ? "Kasbon"
                                    : "Pelunasan"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-[#cfd5df]">
                              {t.type === "catch"
                                ? `${t.species || "Ikan"} • ${t.weight_kg ?? 0} kg × ${formatRupiah(Number(t.price_per_kg || 0))}`
                                : t.note || "-"}
                            </td>
                            <td className="px-6 py-4 font-mono text-[11px] uppercase text-[#8b94a5]">
                              {t.source}
                            </td>
                            <td
                              className={`px-6 py-4 text-right font-mono text-xs sm:text-sm font-semibold whitespace-nowrap ${
                                t.type === "catch"
                                  ? "text-[#4ec38e]"
                                  : t.type === "advance"
                                    ? "text-[#d9a05b]"
                                    : "text-sky-400"
                              }`}
                            >
                              {formatRupiah(Number(t.amount))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function FishermanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090b0e] flex items-center justify-center text-xs font-mono uppercase tracking-widest text-[#6d7687]">
          Memuat profil nelayan...
        </div>
      }
    >
      <FishermanDetailContent params={params} />
    </Suspense>
  );
}
