"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface FishermanOption {
  id: string;
  name: string;
  is_active: boolean;
}

interface TransactionItem {
  id: string;
  fisherman_id: string;
  type: "catch" | "advance" | "repayment";
  species: string | null;
  weight_kg: number | null;
  price_per_kg: number | null;
  amount: number;
  note: string | null;
  occurred_at: string;
  source: string;
  fishermen: { name: string; boat_name: string | null } | null;
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function TransactionsPage() {
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    location: string | null;
    pendingDrafts: number;
  }>({ name: "Organisasi Pengepul", location: null, pendingDrafts: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [fishermen, setFishermen] = useState<FishermanOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filterFisherman, setFilterFisherman] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txnType, setTxnType] = useState<"catch" | "advance" | "repayment">(
    "catch",
  );
  const [form, setForm] = useState({
    fisherman_id: "",
    species: "",
    weight_kg: "",
    price_per_kg: "",
    amount: "",
    note: "",
    occurred_at: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const calculatedCatchAmount =
    (parseFloat(form.weight_kg) || 0) * (parseFloat(form.price_per_kg) || 0);

  const fetchInitialMeta = async () => {
    const [fishRes, dashRes] = await Promise.all([
      fetch("/api/fishermen"),
      fetch("/api/dashboard"),
    ]);

    if (fishRes.ok) {
      const json = await fishRes.json();
      setFishermen(json.fishermen || []);
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
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterFisherman !== "all") params.set("fisherman_id", filterFisherman);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);

    const res = await fetch(`/api/transactions?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setTransactions(json.transactions || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInitialMeta();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filterFisherman, startDate, endDate]);

  const openModal = () => {
    const activeList = fishermen.filter((f) => f.is_active);
    setTxnType("catch");
    setForm({
      fisherman_id: activeList[0]?.id || "",
      species: "",
      weight_kg: "",
      price_per_kg: "",
      amount: "",
      note: "",
      occurred_at: getLocalDateTimeString(),
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const payload =
      txnType === "catch"
        ? {
            type: "catch",
            fisherman_id: form.fisherman_id,
            species: form.species,
            weight_kg: parseFloat(form.weight_kg),
            price_per_kg: parseFloat(form.price_per_kg),
            note: form.note || null,
            occurred_at: form.occurred_at,
          }
        : {
            type: txnType,
            fisherman_id: form.fisherman_id,
            amount: parseFloat(form.amount),
            note: form.note || null,
            occurred_at: form.occurred_at,
          };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(data.error || "Gagal mencatat transaksi");
      return;
    }

    setIsModalOpen(false);
    fetchTransactions();
  };

  const resetFilters = () => {
    setFilterFisherman("all");
    setStartDate("");
    setEndDate("");
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
                BUKU KAS TRANSAKSI
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[170px] block">
                {orgInfo.name}
              </span>
            </div>
          </div>

          <button
            onClick={openModal}
            className="px-3.5 py-2 rounded-full bg-[#158052] text-white text-[11px] font-bold uppercase tracking-wider"
          >
            + Manual
          </button>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {/* Editorial Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#4ec38e] block mb-1.5">
                MUTASI &amp; ARUS KAS
              </span>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Buku Kas{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  Transaksi
                </span>{" "}
                Nelayan
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/ai-input"
                className="px-4 py-2.5 text-xs font-medium bg-[#11141b] hover:bg-[#151922] text-[#4ec38e] border border-[#22382e] rounded-full transition-colors"
              >
                Input Suara / Foto AI
              </Link>
              <button
                onClick={openModal}
                className="px-5 py-2.5 text-xs uppercase tracking-[0.16em] font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors"
              >
                + Catat Manual
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#11141b] border border-[#1e232e] p-5 sm:p-6 rounded-[24px] flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b94a5] mb-2">
                Filter Nelayan
              </label>
              <select
                value={filterFisherman}
                onChange={(e) => setFilterFisherman(e.target.value)}
                className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052] transition-colors"
              >
                <option value="all">Semua Nelayan</option>
                {fishermen.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b94a5] mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052] transition-colors"
              />
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#8b94a5] mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052] transition-colors"
              />
            </div>

            {(filterFisherman !== "all" || startDate || endDate) && (
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 rounded-xl bg-[#151922] border border-[#262c3a] text-xs font-mono text-[#9aa3b2] hover:text-white transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Tabel Transaksi */}
          <div className="bg-[#11141b] border border-[#1e232e] rounded-[28px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0d1017] text-[#8b94a5] text-[10px] font-bold uppercase tracking-[0.2em] border-b border-[#1e232e]">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Nelayan</th>
                    <th className="px-6 py-4">Jenis</th>
                    <th className="px-6 py-4">Rincian</th>
                    <th className="px-6 py-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232e]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-[#6d7687]"
                      >
                        Memuat transaksi buku kas...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-xs text-[#6d7687]"
                      >
                        Tidak ada transaksi ditemukan pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr
                        key={t.id}
                        className="hover:bg-[#151922] transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-[#8b94a5] whitespace-nowrap">
                          {new Date(t.occurred_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/fishermen/${t.fisherman_id}`}
                            className="font-medium text-white hover:text-[#4ec38e] transition-colors"
                          >
                            {t.fishermen?.name || "Nelayan"}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {t.type === "catch" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#101c17] text-[#4ec38e] border border-[#22382e]">
                              Setoran Ikan
                            </span>
                          )}
                          {t.type === "advance" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#261f14] text-[#d9a05b] border border-[#3d311e]">
                              Kasbon
                            </span>
                          )}
                          {t.type === "repayment" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-[#121f26] text-[#64a6bd] border border-[#213845]">
                              Pelunasan
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#cfd5df]">
                          {t.type === "catch" ? (
                            <span>
                              <strong className="text-white font-semibold">
                                {t.species}
                              </strong>{" "}
                              <span className="text-[#6d7687]">&mdash;</span>{" "}
                              <span className="font-mono text-xs">
                                {t.weight_kg} kg ×{" "}
                                {formatRupiah(Number(t.price_per_kg || 0))}
                              </span>
                            </span>
                          ) : (
                            <span>
                              {t.note ||
                                (t.type === "advance"
                                  ? "Pinjaman kasbon"
                                  : "Cicilan kasbon")}
                            </span>
                          )}
                          {t.type === "catch" && t.note && (
                            <p className="text-xs text-[#6d7687] mt-0.5">
                              {t.note}
                            </p>
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-mono text-xs sm:text-sm font-semibold tabular-nums whitespace-nowrap ${
                            t.type === "catch"
                              ? "text-[#4ec38e]"
                              : t.type === "advance"
                                ? "text-[#d9a05b]"
                                : "text-[#64a6bd]"
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
        </main>
      </div>

      {/* Modal Tambah Transaksi Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#090b0e]/85 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#1e232e] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block">
                  PENCATATAN LANGSUNG
                </span>
                <h2 className="text-lg font-semibold text-white mt-0.5">
                  Catat Transaksi Manual
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#151922] border border-[#262c3a] text-xs text-[#9aa3b2] hover:text-white"
              >
                ✕
              </button>
            </div>

            {formError && (
              <p className="text-xs text-[#f28b96] bg-[#241316] border border-[#4a2026] p-3 rounded-2xl">
                {formError}
              </p>
            )}

            {/* Tab Jenis Transaksi */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#090b0e] p-1.5 rounded-2xl border border-[#1e232e]">
              {[
                { key: "catch", label: "Tangkapan" },
                { key: "advance", label: "Kasbon" },
                { key: "repayment", label: "Pelunasan" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() =>
                    setTxnType(tab.key as "catch" | "advance" | "repayment")
                  }
                  className={`py-2 text-xs font-semibold rounded-xl transition-colors ${
                    txnType === tab.key
                      ? "bg-[#158052] text-white"
                      : "text-[#8b94a5] hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                  Pilih Nelayan *
                </label>
                <select
                  required
                  value={form.fisherman_id}
                  onChange={(e) =>
                    setForm({ ...form, fisherman_id: e.target.value })
                  }
                  className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                >
                  <option value="" disabled>
                    -- Pilih Nelayan --
                  </option>
                  {fishermen
                    .filter((f) => f.is_active)
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
              </div>

              {txnType === "catch" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                      Jenis Ikan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="cth: Tongkol, Tuna, Cakalang"
                      value={form.species}
                      onChange={(e) =>
                        setForm({ ...form, species: e.target.value })
                      }
                      className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                        Berat (kg) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0"
                        value={form.weight_kg}
                        onChange={(e) =>
                          setForm({ ...form, weight_kg: e.target.value })
                        }
                        className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                        Harga / kg (Rp) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="0"
                        value={form.price_per_kg}
                        onChange={(e) =>
                          setForm({ ...form, price_per_kg: e.target.value })
                        }
                        className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                      />
                    </div>
                  </div>

                  {/* Kalkulasi Otomatis Read-Only */}
                  <div className="bg-[#101c17] border border-[#22382e] px-4 py-3 rounded-2xl flex items-center justify-between">
                    <span className="text-xs text-[#8ba398]">
                      Total Otomatis:
                    </span>
                    <span className="font-mono text-base font-bold text-[#4ec38e]">
                      {formatRupiah(Math.round(calculatedCatchAmount))}
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                    {txnType === "advance"
                      ? "Nominal Kasbon (Rp) *"
                      : "Nominal Pelunasan (Rp) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="cth: 200000"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                  Waktu Transaksi
                </label>
                <input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(e) =>
                    setForm({ ...form, occurred_at: e.target.value })
                  }
                  className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="cth: Kasbon solar melaut"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e232e]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 text-xs font-medium text-[#8b94a5] hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs uppercase tracking-wider font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan Transaksi"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
