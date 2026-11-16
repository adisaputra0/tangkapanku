"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

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
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    location: string | null;
    pendingDrafts: number;
  }>({ name: "Organisasi Pengepul", location: null, pendingDrafts: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const fetchInitialData = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
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
    fetchInitialData();
  };

  const handleToggleActive = async (f: Fisherman) => {
    const newStatus = !f.is_active;
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
      fetchInitialData();
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
                DATA NELAYAN
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[170px] block">
                {orgInfo.name}
              </span>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="px-3.5 py-2 rounded-full bg-[#158052] text-white text-[11px] font-bold uppercase tracking-wider"
          >
            + Nelayan
          </button>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {/* Editorial Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#4ec38e] block mb-1.5">
                DIREKTORI MITRA PESISIR
              </span>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Kelola Data{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  Nelayan
                </span>{" "}
                &amp; Armada
              </h1>
            </div>

            <button
              onClick={openAddModal}
              className="px-5 py-2.5 text-xs uppercase tracking-[0.16em] font-bold bg-[#158052] hover:bg-[#19935f] text-white rounded-full transition-colors self-start sm:self-auto"
            >
              + Tambah Nelayan
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#11141b] border border-[#1e232e] p-5 sm:p-6 rounded-[24px] flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Cari nama nelayan atau nama kapal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052] transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              {(["all", "active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-xs font-medium rounded-full border transition-colors ${
                    filterStatus === status
                      ? "bg-[#101c17] border-[#22382e] text-[#4ec38e]"
                      : "bg-[#090b0e] border-[#222834] text-[#8b94a5] hover:text-white"
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
          <div className="bg-[#11141b] border border-[#1e232e] rounded-[28px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0d1017] text-[#8b94a5] text-[10px] font-bold uppercase tracking-[0.2em] border-b border-[#1e232e]">
                  <tr>
                    <th className="px-6 py-4">Nelayan &amp; Kapal</th>
                    <th className="px-6 py-4">Kontak</th>
                    <th className="px-6 py-4">Total Setoran</th>
                    <th className="px-6 py-4">Sisa Kasbon</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e232e]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-xs font-mono uppercase tracking-widest text-[#6d7687]"
                      >
                        Memuat daftar nelayan...
                      </td>
                    </tr>
                  ) : filteredFishermen.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-xs text-[#6d7687]"
                      >
                        Tidak ada data nelayan yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    filteredFishermen.map((f) => (
                      <tr
                        key={f.id}
                        className={`transition-colors ${
                          f.is_active
                            ? "hover:bg-[#151922]"
                            : "opacity-60 bg-[#0b0d12]"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/fishermen/${f.id}`}
                            className="font-medium text-white hover:text-[#4ec38e] transition-colors"
                          >
                            {f.name}
                          </Link>
                          <p className="text-xs text-[#8b94a5] mt-0.5">
                            {f.boat_name
                              ? `Kapal: ${f.boat_name}`
                              : "Tanpa keterangan kapal"}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-[#9aa3b2] whitespace-nowrap">
                          {f.phone || "-"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs sm:text-sm text-[#4ec38e] font-medium tabular-nums whitespace-nowrap">
                          {formatRupiah(f.total_catch_value)}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs sm:text-sm text-[#d9a05b] font-medium tabular-nums whitespace-nowrap">
                          {formatRupiah(f.outstanding_advance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${
                              f.is_active
                                ? "bg-[#101c17] text-[#4ec38e] border border-[#22382e]"
                                : "bg-[#151922] text-[#8b94a5] border border-[#262c3a]"
                            }`}
                          >
                            {f.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <Link
                              href={`/credit/${f.id}`}
                              className="px-3 py-1.5 text-xs bg-[#090b0e] hover:bg-[#151922] text-[#9aa3b2] hover:text-white border border-[#222834] rounded-full transition-colors"
                            >
                              Kredit
                            </Link>
                            <button
                              onClick={() => openEditModal(f)}
                              className="px-3 py-1.5 text-xs bg-[#151922] hover:bg-[#1e2430] text-[#cfd5df] hover:text-white border border-[#262c3a] rounded-full transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(f)}
                              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                f.is_active
                                  ? "bg-[#241316] hover:bg-[#331a1f] text-[#f28b96] border-[#4a2026]"
                                  : "bg-[#101c17] hover:bg-[#162820] text-[#4ec38e] border-[#22382e]"
                              }`}
                            >
                              {f.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
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

      {/* Modal Tambah / Edit Nelayan */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#090b0e]/85 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#1e232e] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block">
                  {editingItem ? "PEMBARUAN PROFIL" : "REGISTRASI MITRA"}
                </span>
                <h2 className="text-lg font-semibold text-white mt-0.5">
                  {editingItem ? "Edit Data Nelayan" : "Tambah Nelayan Baru"}
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

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                  Nama Lengkap Nelayan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Pak Nyoman Sutrisna"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                  Nama Kapal / Perahu
                </label>
                <input
                  type="text"
                  placeholder="cth: KM Bahari Jaya"
                  value={form.boat_name}
                  onChange={(e) =>
                    setForm({ ...form, boat_name: e.target.value })
                  }
                  className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                  No. HP / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="cth: 081234567890"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
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
                {submitting ? "Menyimpan..." : "Simpan Data"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
