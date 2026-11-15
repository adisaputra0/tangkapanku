"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Fisherman {
  id: string;
  name: string;
  phone: string | null;
  boat_name: string | null;
  is_active: boolean;
  total_catch_value: number;
  outstanding_advance: number;
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

export default function FishermenPage() {
  const [fishermen, setFishermen] = useState<Fisherman[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  // State Modal Tambah / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Fisherman | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", boat_name: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchFishermen = async () => {
    setLoading(true);
    const res = await fetch("/api/fishermen");
    if (res.ok) {
      const json = await res.json();
      setFishermen(json.fishermen || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFishermen();
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setForm({ name: "", phone: "", boat_name: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (f: Fisherman) => {
    setEditingItem(f);
    setForm({
      name: f.name,
      phone: f.phone || "",
      boat_name: f.boat_name || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const url = editingItem
      ? `/api/fishermen/${editingItem.id}`
      : "/api/fishermen";
    const method = editingItem ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(data.error || "Gagal menyimpan data nelayan");
      return;
    }

    setIsModalOpen(false);
    fetchFishermen();
  };

  const handleToggleActive = async (f: Fisherman) => {
    const newStatus = !f.is_active;
    // Optimistic update UI
    setFishermen((prev) =>
      prev.map((item) =>
        item.id === f.id ? { ...item, is_active: newStatus } : item,
      ),
    );

    const res = await fetch(`/api/fishermen/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newStatus }),
    });

    if (!res.ok) {
      // Revert jika gagal
      fetchFishermen();
    }
  };

  const filteredFishermen = fishermen.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.boat_name && f.boat_name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && f.is_active) ||
      (filterStatus === "inactive" && !f.is_active);
    return matchSearch && matchStatus;
  });

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
            <h1 className="text-lg font-bold text-white">
              Kelola Data Nelayan
            </h1>
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            + Tambah Nelayan
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <input
            type="text"
            placeholder="Cari nama nelayan atau nama kapal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />

          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  filterStatus === status
                    ? "bg-blue-600/20 border-blue-500 text-blue-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {status === "all"
                  ? "Semua"
                  : status === "active"
                    ? "Aktif"
                    : "Nonaktif"}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel Daftar Nelayan */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3.5">Nelayan & Kapal</th>
                  <th className="px-5 py-3.5">Kontak</th>
                  <th className="px-5 py-3.5">Total Setoran</th>
                  <th className="px-5 py-3.5">Sisa Kasbon</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Memuat daftar nelayan...
                    </td>
                  </tr>
                ) : filteredFishermen.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-8 text-center text-slate-500"
                    >
                      Tidak ada data nelayan yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredFishermen.map((f) => (
                    <tr
                      key={f.id}
                      className={`transition ${
                        f.is_active
                          ? "hover:bg-slate-800/40"
                          : "opacity-60 bg-slate-950/40"
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{f.name}</p>
                        <p className="text-xs text-slate-400">
                          {f.boat_name
                            ? `Kapal: ${f.boat_name}`
                            : "Tanpa keterangan kapal"}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-xs">
                        {f.phone || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-emerald-400 font-medium">
                        {formatRupiah(f.total_catch_value)}
                      </td>
                      <td className="px-5 py-3.5 text-amber-400 font-medium">
                        {formatRupiah(f.outstanding_advance)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            f.is_active
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {f.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(f)}
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(f)}
                          className={`px-2.5 py-1 text-xs rounded-md transition ${
                            f.is_active
                              ? "bg-red-950/60 hover:bg-red-900/50 text-red-400 border border-red-900/50"
                              : "bg-emerald-950/60 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/50"
                          }`}
                        >
                          {f.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Tambah / Edit Nelayan */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-white">
              {editingItem ? "Edit Data Nelayan" : "Tambah Nelayan Baru"}
            </h2>

            {formError && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-900 p-2.5 rounded-lg">
                {formError}
              </p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nama Lengkap Nelayan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Pak Nyoman Sutrisna"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Nama Kapal / Perahu
                </label>
                <input
                  type="text"
                  placeholder="cth: KM Bahari Jaya"
                  value={form.boat_name}
                  onChange={(e) =>
                    setForm({ ...form, boat_name: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  No. HP / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="cth: 081234567890"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                {submitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
