"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

// Helper waktu lokal untuk input datetime-local (hanya dipanggil di event handler)
const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function TransactionsPage() {
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
    occurred_at: "", // <-- Diubah menjadi string kosong agar tidak memicu new Date() saat render
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Kalkulasi otomatis berat x harga
  const calculatedCatchAmount =
    (parseFloat(form.weight_kg) || 0) * (parseFloat(form.price_per_kg) || 0);

  const fetchFishermen = async () => {
    const res = await fetch("/api/fishermen");
    if (res.ok) {
      const json = await res.json();
      setFishermen(json.fishermen || []);
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
    fetchFishermen();
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
      occurred_at: getLocalDateTimeString(), // <-- Aman dipanggil di dalam event handler
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-700">|</span>
            <h1 className="text-lg font-bold text-white">Buku Kas Transaksi</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/ai-input"
              className="px-3.5 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-lg transition"
            >
              Input Suara / Foto AI
            </Link>
            <button
              onClick={openModal}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              + Catat Manual
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Filter Nelayan
            </label>
            <select
              value={filterFisherman}
              onChange={(e) => setFilterFisherman(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Nelayan</option>
              {fishermen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {(filterFisherman !== "all" || startDate || endDate) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white underline"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Tabel Transaksi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Nelayan</th>
                  <th className="px-5 py-3.5">Jenis</th>
                  <th className="px-5 py-3.5">Rincian</th>
                  <th className="px-5 py-3.5 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Memuat transaksi buku kas...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Tidak ada transaksi ditemukan pada filter ini.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(t.occurred_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/fishermen/${t.fisherman_id}`}
                          className="font-medium text-blue-400 hover:underline"
                        >
                          {t.fishermen?.name || "Nelayan"}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        {t.type === "catch" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Setoran Ikan
                          </span>
                        )}
                        {t.type === "advance" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
                            Kasbon
                          </span>
                        )}
                        {t.type === "repayment" && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-950 text-sky-400 border border-sky-800">
                            Pelunasan
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        {t.type === "catch" ? (
                          <span>
                            <strong className="text-white">{t.species}</strong>{" "}
                            — {t.weight_kg} kg ×{" "}
                            {formatRupiah(Number(t.price_per_kg || 0))}
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
                          <p className="text-xs text-slate-500">{t.note}</p>
                        )}
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                          t.type === "catch"
                            ? "text-emerald-400"
                            : t.type === "advance"
                              ? "text-amber-400"
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
      </main>

      {/* Modal Tambah Transaksi Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-white">
              Catat Transaksi Manual
            </h2>

            {formError && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900 p-2.5 rounded-lg">
                {formError}
              </p>
            )}

            {/* Tab Jenis Transaksi */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
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
                  className={`py-2 text-xs font-medium rounded-md transition ${
                    txnType === tab.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Pilih Nelayan *
                </label>
                <select
                  required
                  value={form.fisherman_id}
                  onChange={(e) =>
                    setForm({ ...form, fisherman_id: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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
                    <label className="block text-xs text-slate-400 mb-1">
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
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
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
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
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
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Kalkulasi Otomatis Read-Only */}
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Total Otomatis (Berat × Harga):
                    </span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatRupiah(Math.round(calculatedCatchAmount))}
                    </span>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
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
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Waktu Transaksi
                </label>
                <input
                  type="datetime-local"
                  value={form.occurred_at}
                  onChange={(e) =>
                    setForm({ ...form, occurred_at: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="cth: Kasbon solar melaut"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
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
