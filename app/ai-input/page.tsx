"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

  // Transform raw ai_inputs row ke state kartu yang bisa diedit
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
        // Fallback pencocokan nama jika dari seed belum ada matched_fisherman_id
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
    const [fishRes, draftsRes] = await Promise.all([
      fetch("/api/fishermen"),
      fetch("/api/ai/drafts"),
    ]);

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

    // Setup Web Speech API (lang: 'id-ID')
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

  // Update field pada kartu draf sebelum dikonfirmasi
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

          // Otomatis hitung ulang amount jika catch
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
    // Pastikan semua nelayan sudah dipilih
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

  // Simpan via Fallback Form Manual
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-700">|</span>
            <h1 className="text-lg font-bold text-white">Input Pintar AI</h1>
          </div>

          <Link
            href="/transactions"
            className="text-xs text-blue-400 hover:underline"
          >
            Lihat Buku Kas →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between">
            <span>✓ {toastMessage}</span>
            <button
              onClick={() => setToastMessage("")}
              className="text-xs underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Panel Input Suara / Teks / Foto Nota */}
        <form
          onSubmit={handleParseSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-white">
                Catat dengan Suara, Teks, atau Foto Nota
              </h2>
              <p className="text-xs text-slate-400">
                Contoh: &ldquo;Pak Ahmad setor 40 kilo tongkol harga 28 ribu,
                kasbon 200 ribu&rdquo;
              </p>
            </div>

            {speechSupported && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                  isRecording
                    ? "bg-red-600 text-white animate-pulse"
                    : "bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current" />
                {isRecording
                  ? "Mendengarkan (Klik Stop)..."
                  : "Rekam Suara (ID)"}
              </button>
            )}
          </div>

          <textarea
            rows={3}
            placeholder={
              isRecording
                ? "Silakan bicara sekarang..."
                : "Ketik catatan transaksi atau tekan tombol Rekam Suara di atas..."
            }
            value={textInput}
            onChange={(e) => {
              setTextInput(e.target.value);
              if (!imageFile) setInputSource("text");
            }}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 p-3.5 rounded-xl text-sm focus:outline-none focus:border-blue-500"
          />

          {/* Upload & Preview Foto Nota */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition">
                📷 Upload Foto Nota (Max 4MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {imageFile && (
                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/70 px-2.5 py-1.5 rounded-lg">
                  <span>{imageFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setInputSource("text");
                    }}
                    className="text-red-400 hover:text-red-300 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={parsing || (!textInput.trim() && !imageFile)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
            >
              {parsing ? "AI Sedang Menganalisis..." : "Buat Draf Transaksi →"}
            </button>
          </div>

          {imagePreview && (
            <div className="pt-2">
              <img
                src={imagePreview}
                alt="Preview Nota"
                className="max-h-48 rounded-lg border border-slate-700 object-contain"
              />
            </div>
          )}
        </form>

        {/* Error Alert + Fallback ke Form Manual */}
        {parseError && (
          <div className="bg-red-950/40 border border-red-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-300 font-medium">⚠ {parseError}</p>
              <button
                type="button"
                onClick={() => setShowManualFallback(!showManualFallback)}
                className="text-xs text-blue-400 underline"
              >
                {showManualFallback
                  ? "Sembunyikan Form Manual"
                  : "Buka Form Manual"}
              </button>
            </div>

            {showManualFallback && (
              <form
                onSubmit={handleManualFallbackSubmit}
                className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3"
              >
                <h3 className="text-sm font-bold text-white">
                  Fallback: Catat Transaksi Manual
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
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
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                    >
                      {fishermen.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
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
                      className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                    >
                      <option value="catch">Setoran Ikan (Catch)</option>
                      <option value="advance">Kasbon (Advance)</option>
                      <option value="repayment">Pelunasan (Repayment)</option>
                    </select>
                  </div>

                  {manualForm.type === "catch" ? (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
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
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
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
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
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
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
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
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-lg text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingManual}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              Draf Menunggu Konfirmasi ({drafts.length})
            </h2>
            <span className="text-xs text-slate-400">
              Periksa & konfirmasi sebelum masuk ke buku kas
            </span>
          </div>

          {drafts.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center text-sm text-slate-500">
              Belum ada draf transaksi pending. Silakan rekam suara, ketik teks,
              atau unggah foto nota di atas.
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl"
              >
                {/* Header Draf */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-950 text-blue-400 border border-blue-800 uppercase">
                        {draft.source}
                      </span>
                      {draft.confidence !== null && (
                        <span className="text-xs text-slate-400">
                          Keyakinan AI:{" "}
                          {Math.round(Number(draft.confidence) * 100)}%
                        </span>
                      )}
                    </div>
                    {draft.raw_text && (
                      <p className="text-xs text-slate-300 italic pt-1">
                        &ldquo;{draft.raw_text}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={confirmingId === draft.id}
                      onClick={() => handleRejectDraft(draft.id)}
                      className="px-3.5 py-2 text-xs font-medium text-red-400 bg-red-950/40 hover:bg-red-900/40 border border-red-900/60 rounded-lg transition"
                    >
                      Tolak Draf
                    </button>
                    <button
                      type="button"
                      disabled={confirmingId === draft.id}
                      onClick={() => handleConfirmDraft(draft)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition disabled:opacity-50"
                    >
                      {confirmingId === draft.id
                        ? "Menyimpan..."
                        : `✓ Konfirmasi (${draft.items.length} Item)`}
                    </button>
                  </div>
                </div>

                {/* Daftar Unclear dari AI */}
                {draft.unclear.length > 0 && (
                  <div className="bg-amber-950/40 border border-amber-800/70 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-semibold text-amber-400">
                      ⚠ Perlu Perhatian Pengepul:
                    </p>
                    <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-0.5">
                      {draft.unclear.map((u, idx) => (
                        <li key={idx}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Kartu Item Draf yang Bisa Diedit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draft.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border space-y-3 ${
                        item.needs_manual_fisherman
                          ? "bg-amber-950/15 border-amber-700/70"
                          : "bg-slate-950/80 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Item #{idx + 1}
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
                          className="bg-slate-800 border border-slate-700 text-xs text-white px-2.5 py-1 rounded-md"
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
                        <label className="block text-xs text-slate-400 mb-1">
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
                          className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none ${
                            !item.fisherman_id
                              ? "bg-amber-950/40 border-amber-500 text-amber-200"
                              : "bg-slate-800 border-slate-700 text-slate-100"
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
                            <label className="block text-xs text-slate-400 mb-1">
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
                              className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">
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
                                className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">
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
                                className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-sm"
                              />
                            </div>
                          </div>

                          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              Total Terhitung:
                            </span>
                            <span className="text-sm font-bold text-emerald-400">
                              {formatRupiah(Number(item.amount) || 0)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
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
                            className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-sm"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">
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
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-sm"
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
  );
}
