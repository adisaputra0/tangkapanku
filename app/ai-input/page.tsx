"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

interface Fisherman {
  id: string;
  name: string;
  is_active: boolean;
}

interface EditableDraftItem {
  fisherman_id: string;
  fisherman_name: string;
  matched_fisherman_name: string | null;
  needs_manual_fisherman: boolean;
  type: "catch" | "advance" | "repayment";
  species: string;
  weight_kg: string;
  price_per_kg: string;
  amount: string;
  note: string;
}

interface PendingDraft {
  id: string;
  source: string;
  raw_text: string | null;
  confidence: number | null;
  created_at: string;
  unclear: string[];
  items: EditableDraftItem[];
}

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);

export default function SmartInputPage() {
  const [orgInfo, setOrgInfo] = useState<{
    name: string;
    location: string | null;
  }>({ name: "Organisasi Pengepul", location: null });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [fishermen, setFishermen] = useState<Fisherman[]>([]);
  const [textInput, setTextInput] = useState("");
  const [inputSource, setInputSource] = useState<"text" | "voice" | "photo">(
    "text",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Voice Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Processing & Drafts State
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [drafts, setDrafts] = useState<PendingDraft[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Fallback Manual Form State
  const [manualForm, setManualForm] = useState({
    fisherman_id: "",
    type: "catch" as "catch" | "advance" | "repayment",
    species: "",
    weight_kg: "",
    price_per_kg: "",
    amount: "",
    note: "",
  });
  const [savingManual, setSavingManual] = useState(false);

  const mapRawDraftToEditable = (
    raw: any,
    fishermenList: Fisherman[],
  ): PendingDraft => {
    const parsedItems = raw.parsed?.items || [];
    return {
      id: raw.id,
      source: raw.source,
      raw_text: raw.raw_text,
      confidence: raw.confidence,
      created_at: raw.created_at,
      unclear: raw.parsed?.unclear || [],
      items: parsedItems.map((it: any) => {
        let matchedId = it.matched_fisherman_id || "";
        if (!matchedId && it.fisherman_name) {
          const found = fishermenList.find(
            (f) => f.name.toLowerCase() === it.fisherman_name.toLowerCase(),
          );
          if (found) matchedId = found.id;
        }

        const w = it.weight_kg ?? "";
        const p = it.price_per_kg ?? "";
        const calcAmount =
          it.type === "catch" && w && p
            ? Math.round(Number(w) * Number(p))
            : (it.amount ?? 0);

        return {
          fisherman_id: matchedId,
          fisherman_name: it.fisherman_name || "",
          matched_fisherman_name: it.matched_fisherman_name || null,
          needs_manual_fisherman:
            !matchedId || Boolean(it.needs_manual_fisherman),
          type: it.type || "catch",
          species: it.species || "",
          weight_kg: String(w),
          price_per_kg: String(p),
          amount: String(calcAmount),
          note: it.note || "",
        };
      }),
    };
  };

  const loadInitialData = async () => {
    const [fishRes, draftsRes, dashRes] = await Promise.all([
      fetch("/api/fishermen"),
      fetch("/api/ai/drafts"),
      fetch("/api/dashboard"),
    ]);

    if (dashRes.ok) {
      const dashJson = await dashRes.json();
      if (dashJson.organization) {
        setOrgInfo({
          name: dashJson.organization.name,
          location: dashJson.organization.location,
        });
      }
    }

    let loadedFishermen: Fisherman[] = [];
    if (fishRes.ok) {
      const fJson = await fishRes.json();
      loadedFishermen = (fJson.fishermen || []).filter(
        (f: Fisherman) => f.is_active,
      );
      setFishermen(loadedFishermen);
      if (loadedFishermen.length > 0) {
        setManualForm((prev) => ({
          ...prev,
          fisherman_id: loadedFishermen[0].id,
        }));
      }
    }

    if (draftsRes.ok) {
      const dJson = await draftsRes.json();
      setDrafts(
        (dJson.drafts || []).map((d: any) =>
          mapRawDraftToEditable(d, loadedFishermen),
        ),
      );
    }
  };

  useEffect(() => {
    loadInitialData();

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setTextInput(transcript);
      setInputSource("voice");
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setParseError("");
      setTextInput("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      setInputSource("photo");
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
      setInputSource("text");
    }
  };

  const handleParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !imageFile) return;

    setParsing(true);
    setParseError("");
    setShowManualFallback(false);
    setToastMessage("");

    try {
      const formData = new FormData();
      if (textInput.trim()) formData.append("text", textInput.trim());
      formData.append("source", imageFile ? "photo" : inputSource);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/ai/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || "AI gagal memproses catatan.");
        setShowManualFallback(true);
        return;
      }

      const newDraft = mapRawDraftToEditable(data.draft, fishermen);
      setDrafts((prev) => [newDraft, ...prev]);
      setTextInput("");
      setImageFile(null);
      setImagePreview(null);
      setInputSource("text");
    } catch {
      setParseError(
        "Koneksi gagal saat menghubungi AI. Gunakan input manual di bawah.",
      );
      setShowManualFallback(true);
    } finally {
      setParsing(false);
    }
  };

  const updateDraftItem = (
    draftId: string,
    itemIndex: number,
    field: keyof EditableDraftItem,
    value: string,
  ) => {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== draftId) return d;
        const updatedItems = d.items.map((item, idx) => {
          if (idx !== itemIndex) return item;
          const next = { ...item, [field]: value };

          if (field === "fisherman_id" && value) {
            next.needs_manual_fisherman = false;
          }

          if (next.type === "catch") {
            const w = parseFloat(next.weight_kg) || 0;
            const p = parseFloat(next.price_per_kg) || 0;
            next.amount = String(Math.round(w * p));
          }
          return next;
        });
        return { ...d, items: updatedItems };
      }),
    );
  };

  const handleConfirmDraft = async (draft: PendingDraft) => {
    const missingFisherman = draft.items.some((it) => !it.fisherman_id);
    if (missingFisherman) {
      alert("Pilih nama nelayan terlebih dahulu pada semua kartu transaksi.");
      return;
    }

    setConfirmingId(draft.id);
    setToastMessage("");

    const payload = {
      action: "confirm",
      items: draft.items.map((it) => ({
        fisherman_id: it.fisherman_id,
        type: it.type,
        species: it.type === "catch" ? it.species : null,
        weight_kg: it.type === "catch" ? parseFloat(it.weight_kg) || 0 : null,
        price_per_kg:
          it.type === "catch" ? parseFloat(it.price_per_kg) || 0 : null,
        amount: parseFloat(it.amount) || 0,
        note: it.note || null,
      })),
    };

    const res = await fetch(`/api/ai/parse/${draft.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setConfirmingId(null);

    if (!res.ok) {
      alert(data.error || "Gagal mengonfirmasi draf");
      return;
    }

    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    setToastMessage(
      data.message || "Transaksi berhasil dikonfirmasi ke buku kas!",
    );
  };

  const handleRejectDraft = async (draftId: string) => {
    setConfirmingId(draftId);
    const res = await fetch(`/api/ai/parse/${draftId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    setConfirmingId(null);

    if (res.ok) {
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    }
  };

  const handleManualFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingManual(true);

    const payload =
      manualForm.type === "catch"
        ? {
            type: "catch",
            fisherman_id: manualForm.fisherman_id,
            species: manualForm.species,
            weight_kg: parseFloat(manualForm.weight_kg),
            price_per_kg: parseFloat(manualForm.price_per_kg),
            note: manualForm.note || null,
          }
        : {
            type: manualForm.type,
            fisherman_id: manualForm.fisherman_id,
            amount: parseFloat(manualForm.amount),
            note: manualForm.note || null,
          };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingManual(false);
    if (res.ok) {
      setShowManualFallback(false);
      setParseError("");
      setToastMessage("Transaksi berhasil disimpan melalui form manual!");
    } else {
      const err = await res.json();
      alert(err.error || "Gagal menyimpan transaksi manual");
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#ececec]">
      {/* Reusable Sidebar */}
      <Sidebar
        orgName={orgInfo.name}
        orgLocation={orgInfo.location}
        pendingDrafts={drafts.length}
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
                INPUT PINTAR AI
              </span>
              <span className="text-xs font-semibold text-white truncate max-w-[180px] block">
                {orgInfo.name}
              </span>
            </div>
          </div>

          <Link
            href="/transactions"
            className="text-xs font-mono text-[#4ec38e] hover:underline"
          >
            Buku Kas &rarr;
          </Link>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-8 lg:px-10 py-8 space-y-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#1e232e] pb-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#4ec38e] block mb-1.5">
                MULTIMODAL AI EXTRACTOR
              </span>
              <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
                Catat Transaksi{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  Suara, Teks &amp; Nota
                </span>
              </h1>
            </div>

            <Link
              href="/transactions"
              className="text-xs font-mono text-[#9aa3b2] hover:text-white transition-colors"
            >
              Lihat Buku Kas &rarr;
            </Link>
          </div>

          {/* Success Toast */}
          {toastMessage && (
            <div className="p-4 rounded-2xl bg-[#101c17] border border-[#22382e] text-[#4ec38e] text-xs sm:text-sm flex items-center justify-between gap-4">
              <span>✓ {toastMessage}</span>
              <button
                onClick={() => setToastMessage("")}
                className="text-xs font-mono uppercase tracking-wider text-[#8ba398] hover:text-white"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Multimodal Input Panel */}
          <form
            onSubmit={handleParseSubmit}
            className="bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-8 space-y-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6d7687] block mb-1">
                  LANGKAH 01 • INPUT MENTAH
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-white">
                  Rekam Suara, Ketik Catatan, atau Unggah Foto Nota
                </h2>
                <p className="text-xs text-[#8b94a5] mt-1 font-light">
                  Contoh:{" "}
                  <span className="font-serif italic text-[#cfd5df]">
                    &ldquo;Pak Ahmad setor 40 kilo tongkol harga 28 ribu, kasbon
                    200 ribu&rdquo;
                  </span>
                </p>
              </div>

              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                    isRecording
                      ? "bg-[#36181d] border border-[#6e2b35] text-[#f28b96]"
                      : "bg-[#151922] hover:bg-[#1b202c] text-[#4ec38e] border border-[#263b32]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRecording ? "bg-[#f28b96]" : "bg-[#34a875]"
                    }`}
                  />
                  {isRecording
                    ? "Mendengarkan (Klik Stop)..."
                    : "Rekam Suara (id-ID)"}
                </button>
              )}
            </div>

            <textarea
              rows={3}
              placeholder={
                isRecording
                  ? "Silakan bicara sekarang..."
                  : "Ketik catatan transaksi di sini atau tekan tombol Rekam Suara di atas..."
              }
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                if (!imageFile) setInputSource("text");
              }}
              className="w-full bg-[#090b0e] border border-[#222834] text-white placeholder-[#525b6c] p-4 rounded-2xl text-sm leading-relaxed focus:outline-none focus:border-[#158052] transition-colors"
            />

            {/* Upload & Submit Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-4 py-2.5 text-xs font-medium bg-[#151922] hover:bg-[#1b202c] text-[#cfd5df] border border-[#262c3a] rounded-full transition-colors">
                  Upload Foto Nota (Max 4MB)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {imageFile && (
                  <div className="flex items-center gap-2 text-xs text-[#4ec38e] bg-[#101c17] border border-[#22382e] px-3.5 py-1.5 rounded-full font-mono">
                    <span className="truncate max-w-[180px]">
                      {imageFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setInputSource("text");
                      }}
                      className="text-[#f28b96] hover:text-white font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={parsing || (!textInput.trim() && !imageFile)}
                className="px-6 py-3 bg-[#158052] hover:bg-[#19935f] text-white text-xs uppercase tracking-[0.18em] font-bold rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {parsing
                  ? "AI Sedang Menganalisis..."
                  : "Buat Draf Transaksi →"}
              </button>
            </div>

            {imagePreview && (
              <div className="pt-2">
                <div className="inline-block p-2 rounded-2xl bg-[#090b0e] border border-[#222834]">
                  <img
                    src={imagePreview}
                    alt="Preview Nota"
                    className="max-h-48 rounded-xl object-contain"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Error Alert + Fallback ke Form Manual */}
          {parseError && (
            <div className="bg-[#1b1113] border border-[#4a2026] rounded-[28px] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-[#f28b96] font-medium">
                  ⚠ {parseError}
                </p>
                <button
                  type="button"
                  onClick={() => setShowManualFallback(!showManualFallback)}
                  className="text-xs font-mono text-[#4ec38e] hover:underline"
                >
                  {showManualFallback
                    ? "Sembunyikan Form Manual"
                    : "Buka Form Manual"}
                </button>
              </div>

              {showManualFallback && (
                <form
                  onSubmit={handleManualFallbackSubmit}
                  className="bg-[#11141b] border border-[#1e232e] p-5 rounded-2xl space-y-4"
                >
                  <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-[#4ec38e]">
                    Fallback: Catat Transaksi Manual
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                        Nelayan
                      </label>
                      <select
                        required
                        value={manualForm.fisherman_id}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            fisherman_id: e.target.value,
                          })
                        }
                        className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                      >
                        {fishermen.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                        Jenis Transaksi
                      </label>
                      <select
                        value={manualForm.type}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            type: e.target.value as any,
                          })
                        }
                        className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                      >
                        <option value="catch">Setoran Ikan (Catch)</option>
                        <option value="advance">Kasbon (Advance)</option>
                        <option value="repayment">Pelunasan (Repayment)</option>
                      </select>
                    </div>

                    {manualForm.type === "catch" ? (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                            Jenis Ikan
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="cth: Tongkol"
                            value={manualForm.species}
                            onChange={(e) =>
                              setManualForm({
                                ...manualForm,
                                species: e.target.value,
                              })
                            }
                            className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                              Berat (kg)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={manualForm.weight_kg}
                              onChange={(e) =>
                                setManualForm({
                                  ...manualForm,
                                  weight_kg: e.target.value,
                                })
                              }
                              className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                              Harga/kg
                            </label>
                            <input
                              type="number"
                              required
                              value={manualForm.price_per_kg}
                              onChange={(e) =>
                                setManualForm({
                                  ...manualForm,
                                  price_per_kg: e.target.value,
                                })
                              }
                              className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                          Nominal (Rp)
                        </label>
                        <input
                          type="number"
                          required
                          value={manualForm.amount}
                          onChange={(e) =>
                            setManualForm({
                              ...manualForm,
                              amount: e.target.value,
                            })
                          }
                          className="w-full bg-[#090b0e] border border-[#222834] text-white px-3.5 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingManual}
                      className="px-5 py-2.5 bg-[#158052] hover:bg-[#19935f] text-white text-xs uppercase tracking-wider font-bold rounded-full transition-colors"
                    >
                      {savingManual
                        ? "Menyimpan..."
                        : "Simpan Manual ke Buku Kas"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Daftar Draf Menunggu Konfirmasi */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block mb-1">
                  LANGKAH 02 • HUMAN-IN-THE-LOOP
                </span>
                <h2 className="text-lg font-semibold text-white">
                  Draf Menunggu Konfirmasi ({drafts.length})
                </h2>
              </div>
              <span className="text-xs text-[#8b94a5]">
                Periksa &amp; koreksi bila perlu sebelum masuk ke buku kas
              </span>
            </div>

            {drafts.length === 0 ? (
              <div className="bg-[#11141b] border border-[#1e232e] rounded-[28px] p-10 text-center space-y-2">
                <p className="text-sm text-[#9aa3b2]">
                  Belum ada draf transaksi pending.
                </p>
                <p className="text-xs text-[#6d7687]">
                  Rekam suara, ketik catatan, atau unggah foto nota pada panel
                  di atas untuk memulai.
                </p>
              </div>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-[#11141b] border border-[#1e232e] rounded-[28px] p-6 sm:p-7 space-y-5"
                >
                  {/* Header Draf */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1e232e] pb-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 text-[10px] font-mono rounded-full bg-[#101c17] text-[#4ec38e] border border-[#22382e] uppercase">
                          {draft.source}
                        </span>
                        {draft.confidence !== null && (
                          <span className="text-xs font-mono text-[#8b94a5]">
                            Keyakinan AI:{" "}
                            {Math.round(Number(draft.confidence) * 100)}%
                          </span>
                        )}
                      </div>
                      {draft.raw_text && (
                        <p className="font-serif italic text-sm sm:text-base text-[#cfd5df] pt-1">
                          &ldquo;{draft.raw_text}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={confirmingId === draft.id}
                        onClick={() => handleRejectDraft(draft.id)}
                        className="px-4 py-2 text-xs font-medium text-[#f28b96] bg-[#241316] hover:bg-[#331a1f] border border-[#4a2026] rounded-full transition-colors"
                      >
                        Tolak Draf
                      </button>
                      <button
                        type="button"
                        disabled={confirmingId === draft.id}
                        onClick={() => handleConfirmDraft(draft)}
                        className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#158052] hover:bg-[#19935f] rounded-full transition-colors disabled:opacity-50"
                      >
                        {confirmingId === draft.id
                          ? "Menyimpan..."
                          : `✓ Konfirmasi (${draft.items.length} Item)`}
                      </button>
                    </div>
                  </div>

                  {/* Daftar Unclear dari AI */}
                  {draft.unclear.length > 0 && (
                    <div className="bg-[#261f14] border border-[#3d311e] rounded-2xl p-4 space-y-1.5">
                      <p className="text-xs font-semibold text-[#d9a05b]">
                        ⚠ Perlu Perhatian Pengepul:
                      </p>
                      <ul className="list-disc list-inside text-xs text-[#e5cba8] space-y-0.5">
                        {draft.unclear.map((u, idx) => (
                          <li key={idx}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Kartu Item Draf yang Bisa Diedit */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {draft.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-5 rounded-2xl border space-y-3.5 ${
                          item.needs_manual_fisherman
                            ? "bg-[#1a1610] border-[#4a3b22]"
                            : "bg-[#090b0e] border-[#1e232e]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8b94a5]">
                            ITEM #{idx + 1}
                          </span>
                          <select
                            value={item.type}
                            onChange={(e) =>
                              updateDraftItem(
                                draft.id,
                                idx,
                                "type",
                                e.target.value,
                              )
                            }
                            className="bg-[#151922] border border-[#262c3a] text-xs text-white px-3 py-1.5 rounded-full focus:outline-none focus:border-[#158052]"
                          >
                            <option value="catch">Setoran Ikan (Catch)</option>
                            <option value="advance">Kasbon (Advance)</option>
                            <option value="repayment">
                              Pelunasan (Repayment)
                            </option>
                          </select>
                        </div>

                        {/* Dropdown Pilih Nelayan */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                            Nelayan{" "}
                            {item.fisherman_name
                              ? `(AI: "${item.fisherman_name}")`
                              : ""}
                          </label>
                          <select
                            value={item.fisherman_id}
                            onChange={(e) =>
                              updateDraftItem(
                                draft.id,
                                idx,
                                "fisherman_id",
                                e.target.value,
                              )
                            }
                            className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none ${
                              !item.fisherman_id
                                ? "bg-[#261f14] border-[#6b522c] text-[#f0cfa0]"
                                : "bg-[#11141b] border-[#222834] text-white focus:border-[#158052]"
                            }`}
                          >
                            <option value="">
                              -- Pilih Nelayan Secara Manual --
                            </option>
                            {fishermen.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {item.type === "catch" ? (
                          <>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                                Jenis Ikan
                              </label>
                              <input
                                type="text"
                                value={item.species}
                                onChange={(e) =>
                                  updateDraftItem(
                                    draft.id,
                                    idx,
                                    "species",
                                    e.target.value,
                                  )
                                }
                                className="w-full bg-[#11141b] border border-[#222834] text-white px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                                  Berat (kg)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.weight_kg}
                                  onChange={(e) =>
                                    updateDraftItem(
                                      draft.id,
                                      idx,
                                      "weight_kg",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-[#11141b] border border-[#222834] text-white px-3.5 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                                  Harga / kg (Rp)
                                </label>
                                <input
                                  type="number"
                                  value={item.price_per_kg}
                                  onChange={(e) =>
                                    updateDraftItem(
                                      draft.id,
                                      idx,
                                      "price_per_kg",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full bg-[#11141b] border border-[#222834] text-white px-3.5 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                                />
                              </div>
                            </div>

                            <div className="bg-[#101c17] border border-[#22382e] px-4 py-2.5 rounded-xl flex items-center justify-between">
                              <span className="text-xs text-[#8ba398]">
                                Total Terhitung:
                              </span>
                              <span className="font-mono text-sm font-bold text-[#4ec38e]">
                                {formatRupiah(Number(item.amount) || 0)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                              Nominal (Rp)
                            </label>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) =>
                                updateDraftItem(
                                  draft.id,
                                  idx,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-[#11141b] border border-[#222834] text-white px-3.5 py-2 rounded-xl text-sm font-mono focus:outline-none focus:border-[#158052]"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8b94a5] mb-1.5">
                            Catatan
                          </label>
                          <input
                            type="text"
                            placeholder="Opsional"
                            value={item.note}
                            onChange={(e) =>
                              updateDraftItem(
                                draft.id,
                                idx,
                                "note",
                                e.target.value,
                              )
                            }
                            className="w-full bg-[#11141b] border border-[#222834] text-white placeholder-[#525b6c] px-3.5 py-2 rounded-xl text-sm focus:outline-none focus:border-[#158052]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
