"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

type InputMode = "suara" | "nota" | "teks";

const INPUT_SAMPLES: Record<
  InputMode,
  {
    tabLabel: string;
    badge: string;
    quote: string;
    nelayan: string;
    kapal: string;
    jenis: string;
    detail: string;
    kalkulasi: string;
  }
> = {
  suara: {
    tabLabel: "Rekam Suara (id-ID)",
    badge: "Web Speech API • Gemini 2.5 Flash",
    quote:
      "“Catat setoran Pak Wayan barusan, ikan tongkol 42 kilo harga 28 ribu, sekalian potong kasbon 300 ribu.”",
    nelayan: "Pak Wayan",
    kapal: "KM Bahari 02",
    jenis: "Setoran Ikan & Potong Kasbon",
    detail: "Ikan Tongkol • 42 kg × Rp 28.000",
    kalkulasi: "Rp 1.176.000 (Potong Kasbon Rp 300.000)",
  },
  nota: {
    tabLabel: "Foto Nota Tulis Tangan",
    badge: "Multimodal Vision • Zod Validated",
    quote:
      "[nota_dermaga.jpg] — “Bpk. Made - Kakap Merah 18.5kg @65rb | Kasbon solar 150rb”",
    nelayan: "Bpk. Made",
    kapal: "Perahu Sinar Pagi",
    jenis: "Setoran Ikan & Kasbon Baru",
    detail: "Kakap Merah • 18,5 kg × Rp 65.000",
    kalkulasi: "Rp 1.202.500 (Kasbon Baru Rp 150.000)",
  },
  teks: {
    tabLabel: "Catatan Singkat",
    badge: "Natural Language Extractor",
    quote:
      "“Haji Karim ambil kasbon es balok sama bensin 450rb buat melaut malam ini”",
    nelayan: "Haji Karim",
    kapal: "KM Samudra Jaya",
    jenis: "Kasbon Operasional",
    detail: "Perbekalan Melaut (Es & BBM)",
    kalkulasi: "Rp 450.000 (Saldo Utang Bertambah)",
  },
};

const FAQS = [
  {
    q: "Apakah AI langsung menyimpan transaksi ke buku kas tanpa persetujuan?",
    a: "Tidak pernah. TangkapanKu menerapkan prinsip Human-in-the-Loop (Aturan Emas). Seluruh hasil ekstraksi AI berstatus pending dan wajib diperiksa serta dikonfirmasi secara eksplisit oleh pengepul sebelum masuk ke buku kas.",
  },
  {
    q: "Bagaimana pembagian peran antara AI dan rumus sistem dalam perhitungan uang?",
    a: "AI (Gemini 2.5 Flash) hanya bertugas mengekstrak data tidak terstruktur dari suara atau foto nota dan menyusun narasi laporan. Seluruh perhitungan finansial (berat × harga), saldo kasbon, deteksi anomali statistik, dan skor kredit dihitung 100% menggunakan rumus deterministik.",
  },
  {
    q: "Bagaimana cara kerja Laporan Malam Otomatis?",
    a: "Setiap pukul 21:00 WIB, sistem secara otomatis mengagregasi seluruh transaksi hari berjalan, mendeteksi anomali statistik (penurunan harga ikan drastis, lonjakan kasbon, atau outlier berat tangkapan), serta menyusun ringkasan narasi operasional.",
  },
  {
    q: "Apakah skor kelayakan kredit nelayan bersifat keputusan kredit final?",
    a: "Skor bernilai 0–100 dilabeli sebagai indikasi kelayakan kredit berdasarkan data aktual buku kas. Bobot penilaian dirancang transparan untuk membantu nelayan mengakses permodalan di koperasi atau lembaga keuangan mikro (LKM) mitra.",
  },
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<InputMode>("suara");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentSample = INPUT_SAMPLES[activeMode];

  const handleModeSwitch = (mode: InputMode) => {
    setActiveMode(mode);
    setIsConfirmed(false);
  };

  const copyCredential = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#ececec] relative">
      {/* 1. SOLID MATTE HEADER */}
      <header
        className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 ${
          scrolled
            ? "bg-[#090b0e] py-4 border-b border-[#1e232e]"
            : "py-7 bg-[#090b0e]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          {/* Brand Mark */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-15 h-15 rounded-full bg-[#151922] border border-[#262c3a] flex items-center justify-center transition-colors duration-300">
              <Image
                src="/images/logo.png"
                alt="Logo TangkapanKu"
                width={500}
                height={500}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.26em] text-white uppercase">
                TANGKAPANKU
              </span>
              <span className="text-[9px] tracking-[0.18em] text-[#8b94a5] uppercase mt-0.5">
                Coastal AI Ledger
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {[
              { label: "Filosofi", href: "#filosofi" },
              { label: "Arsitektur", href: "#fitur" },
              { label: "Simulasi AI", href: "#simulasi" },
              { label: "Skor Kredit", href: "#kredit" },
              { label: "FAQ", href: "#faq" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[11px] uppercase tracking-[0.22em] text-[#9aa3b2] hover:text-white font-medium transition-colors duration-200 py-1"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-[11px] uppercase tracking-[0.2em] text-[#9aa3b2] hover:text-white px-4 py-2 transition-colors"
            >
              Masuk
            </Link>
            <Link
              href="/login"
              className="bg-[#158052] hover:bg-[#19935f] text-white px-6 py-2.5 rounded-full text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors duration-200"
            >
              Uji Akun Demo
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex flex-col justify-center items-end w-8 h-8 gap-1.5"
            aria-label="Buka Menu"
          >
            <span className="w-6 h-[1.5px] bg-[#ececec] rounded" />
            <span className="w-4 h-[1.5px] bg-[#34a875] rounded" />
            <span className="w-5 h-[1.5px] bg-[#ececec] rounded" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Solid Background) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#090b0e] p-8 flex flex-col justify-between md:hidden">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#8b94a5]">
              Navigasi Utama
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full border border-[#262c3a] bg-[#11141b] flex items-center justify-center text-white"
            >
              ✕
            </button>
          </div>
          <nav className="flex flex-col gap-7">
            {[
              { label: "Filosofi & Masalah", href: "#filosofi" },
              { label: "Pilar Fitur", href: "#fitur" },
              { label: "Simulasi Ekstraksi", href: "#simulasi" },
              { label: "Skor Kredit Nelayan", href: "#kredit" },
              { label: "Pertanyaan Umum", href: "#faq" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="font-serif italic text-3xl text-[#ececec] hover:text-[#34a875] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="border-t border-[#1e232e] pt-6">
            <Link
              href="/login"
              className="block w-full text-center bg-[#158052] text-white py-3.5 rounded-full text-xs uppercase tracking-[0.2em] font-bold"
            >
              Masuk Akun Demo
            </Link>
          </div>
        </div>
      )}

      <main>
        {/* 2. SOLID EDITORIAL HERO SECTION */}
        <section className="min-h-screen flex items-center pt-32 pb-20 border-b border-[#1e232e]">
          <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-10 items-center">
            {/* Left Editorial Typography (7 cols) */}
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#22382e] bg-[#101c17] text-[#4ec38e] text-[10px] font-bold uppercase tracking-[0.24em] mb-8">
                <span className="h-2 w-2 rounded-full bg-[#34a875]" />
                Buku Kas Digital Pengepul Ikan
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-light tracking-tight leading-[1.08] text-white mb-7">
                Cukup bicara atau <br className="hidden sm:inline" />
                foto nota, AI <br className="hidden sm:inline" />
                <span className="font-serif italic font-normal text-[#34a875] border-b border-[#22382e]">
                  mencatat &amp; menjaga
                </span>{" "}
                amanah.
              </h1>

              <p className="text-base sm:text-lg text-[#9aa3b2] font-light leading-relaxed max-w-xl mb-10 tracking-wide">
                Transformasi buku tulis pesisir menjadi sistem operasional
                real-time. Melacak saldo kasbon secara presisi, mendeteksi
                anomali harian, dan membangun profil kredit formal bagi nelayan.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link
                  href="/login"
                  className="text-center bg-[#158052] hover:bg-[#19935f] text-white px-8 py-4 rounded-full text-xs uppercase tracking-[0.2em] font-bold transition-colors duration-200"
                >
                  Masuk Dashboard Demo &rarr;
                </Link>
                <a
                  href="#simulasi"
                  className="text-center border border-[#262c3a] bg-[#11141b] hover:bg-[#191e28] text-[#ececec] px-8 py-4 rounded-full text-xs uppercase tracking-[0.2em] font-semibold transition-colors duration-200"
                >
                  Simulasi Ekstraksi AI
                </a>
              </div>
            </div>

            {/* Right Solid Executive Ledger Card (5 cols) */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0">
              <div className="matte-card rounded-[32px] p-7 sm:p-8">
                <div className="flex items-center justify-between border-b border-[#1e232e] pb-5">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4ec38e] block">
                      RINGKASAN BUKU KAS • 21:00 WIB
                    </span>
                    <h3 className="text-base font-semibold text-white mt-1">
                      Samudra Jaya (Demo)
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#101c17] border border-[#22382e] text-[10px] font-mono text-[#4ec38e]">
                    REAL-TIME
                  </span>
                </div>

                {/* Financial Snapshot */}
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-[#151922] border border-[#222834] p-4">
                    <span className="text-[10px] uppercase tracking-widest text-[#8b94a5]">
                      Total Nilai Tangkapan Hari Ini
                    </span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="font-mono text-2xl font-semibold text-white">
                        Rp 18.450.000
                      </span>
                      <span className="text-xs font-mono text-[#4ec38e]">
                        +14.2%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="rounded-2xl bg-[#151922] border border-[#222834] p-4">
                      <span className="text-[10px] uppercase tracking-wider text-[#8b94a5] block">
                        Kasbon Beredar
                      </span>
                      <span className="font-mono text-sm font-semibold text-[#d9a05b] mt-1 block">
                        Rp 4.120.000
                      </span>
                    </div>
                    <div className="rounded-2xl bg-[#151922] border border-[#222834] p-4">
                      <span className="text-[10px] uppercase tracking-wider text-[#8b94a5] block">
                        Anomali Statistik
                      </span>
                      <span className="font-mono text-sm font-semibold text-[#64a6bd] mt-1 block">
                        0 Terdeteksi
                      </span>
                    </div>
                  </div>

                  {/* Mini Fisherman Credit Preview */}
                  <div className="rounded-2xl border border-[#22382e] bg-[#101c17] p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#4ec38e] block">
                        Indikasi Kelayakan Kredit
                      </span>
                      <span className="text-sm font-medium text-white">
                        Pak Wayan • KM Bahari 02
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-[#4ec38e]">
                        88
                      </span>
                      <span className="text-[10px] text-[#8b94a5]">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solid Overlapping Badge */}
              <div className="hidden sm:block absolute -bottom-7 -left-6 matte-card-elevated px-5 py-4 rounded-2xl max-w-[210px]">
                <span className="text-[9px] uppercase font-bold text-[#8b94a5] tracking-[0.2em] block mb-1">
                  HUMAN-IN-THE-LOOP
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-[#4ec38e] font-mono">
                    100%
                  </span>
                  <span className="text-[11px] text-[#cfd5df]">
                    Validasi Pengepul
                  </span>
                </div>
                <div className="h-1 bg-[#222834] rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-[#158052] h-full w-full rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TECH & ARCHITECTURE STRIP */}
        <section className="py-12 border-b border-[#1e232e] bg-[#0c0f14]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <p className="text-center text-[10px] font-bold tracking-[0.32em] text-[#6d7687] uppercase mb-8">
              DIBANGUN DI ATAS INFRASTRUKTUR DETERMINISTIK &amp; AI MODERN
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center justify-items-center text-[#8b94a5]">
              <span className="font-mono text-xs tracking-widest uppercase hover:text-white transition-colors">
                NEXT.JS APP ROUTER
              </span>
              <span className="font-serif italic text-lg text-[#b7bfcc] hover:text-[#4ec38e] transition-colors">
                Gemini 2.5 Flash
              </span>
              <span className="font-mono text-xs tracking-widest uppercase hover:text-white transition-colors">
                SUPABASE POSTGRES + RLS
              </span>
              <span className="font-mono text-xs tracking-widest uppercase hover:text-white transition-colors">
                ZOD SCHEMA GUARD
              </span>
              <span className="font-mono text-xs tracking-widest uppercase col-span-2 md:col-span-1 hover:text-white transition-colors">
                WEB SPEECH (ID-ID)
              </span>
            </div>
          </div>
        </section>

        {/* 4. STICKY EDITORIAL CONCEPTUALIZATION SECTION */}
        <section id="filosofi" className="py-28 md:py-36">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              {/* Left Sticky Column (5 cols) */}
              <div className="lg:col-span-5 lg:sticky lg:top-32">
                <span className="text-[11px] uppercase tracking-[0.26em] text-[#4ec38e] font-bold block mb-4">
                  — REALITAS PESISIR
                </span>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight leading-[1.15] text-white mb-6">
                  Pencatatan bukan <br className="hidden md:inline" />
                  sekadar angka, <br className="hidden md:inline" />
                  melainkan{" "}
                  <span className="font-serif italic font-normal text-[#34a875]">
                    akses permodalan
                  </span>
                  .
                </h2>
                <div className="w-16 h-[1.5px] bg-[#158052] mb-8" />
                <p className="text-[#9aa3b2] text-sm md:text-base leading-relaxed font-light max-w-sm">
                  Di dermaga, buku tulis fisik sering basah, hilang, atau memicu
                  selisih hitung kasbon—membuat nelayan produktif terputus dari
                  lembaga keuangan formal.
                </p>
              </div>

              {/* Right Staggered Editorial Column (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-12">
                <div className="border-l-2 border-[#158052] pl-6 md:pl-10">
                  <p className="text-xl md:text-2xl font-light leading-relaxed text-[#dce1ea] tracking-wide">
                    TangkapanKu hadir menjembatani kesibukan bongkar muat ikan
                    dengan ketertiban akuntansi modern—tanpa mengubah kebiasaan
                    alami pengepul di lapangan.
                  </p>
                </div>

                {/* Staggered Two-Tone Solid Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="p-8 rounded-[32px] bg-[#11141b] border border-[#1e232e] hover:border-[#2e3646] transition-colors duration-300 flex flex-col justify-between min-h-[290px]">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-[#151922] border border-[#262c3a] text-[#4ec38e] font-mono text-xs mb-6">
                        01 / AI EKSTRAKSI
                      </span>
                      <h3 className="text-lg font-semibold text-white tracking-wide mb-3">
                        Suara, Teks &amp; Foto Nota
                      </h3>
                      <p className="text-xs text-[#9aa3b2] leading-relaxed font-light">
                        Ubah ucapan bahasa Indonesia atau foto nota tulis tangan
                        menjadi draf JSON tervalidasi dalam hitungan detik.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#6d7687] mt-6">
                      HUMAN-IN-THE-LOOP VERIFIED
                    </span>
                  </div>

                  <div className="p-8 rounded-[32px] bg-[#101c17] border border-[#22382e] hover:border-[#2e4d3f] transition-colors duration-300 flex flex-col justify-between md:translate-y-8 min-h-[290px]">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-[#162720] text-[#4ec38e] font-mono text-xs mb-6">
                        02 / DETERMINISTIK
                      </span>
                      <h3 className="text-lg font-semibold text-white tracking-wide mb-3">
                        Zero AI Hallucination
                      </h3>
                      <p className="text-xs text-[#b7c4be] leading-relaxed font-light">
                        AI dilarang menghitung uang. Seluruh perkalian{" "}
                        <code className="text-[#4ec38e]">berat × harga</code>,
                        saldo piutang, dan skor kredit diproses rumus sistem.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-[#4ec38e] mt-6">
                      MATHEMATICAL PRECISION
                    </span>
                  </div>
                </div>

                {/* 3 Key Metrics */}
                <div className="grid grid-cols-3 gap-6 border-t border-[#1e232e] pt-12 mt-12">
                  <div>
                    <span className="text-3xl md:text-5xl font-bold text-[#34a875] tracking-tight block mb-2 font-mono">
                      21:00
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#8b94a5] tracking-widest">
                      Laporan Malam Otomatis
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl md:text-5xl font-bold text-white tracking-tight block mb-2 font-mono">
                      0–100
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#8b94a5] tracking-widest">
                      Skor Kredit Indikatif
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl md:text-5xl font-bold text-[#34a875] tracking-tight block mb-2 font-mono">
                      3 Cara
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#8b94a5] tracking-widest">
                      Input Multimodal
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. ROUNDED SOLID ARCHITECTURAL PILLARS CONTAINER */}
        <section
          id="fitur"
          className="py-24 md:py-32 bg-[#0d1017] border border-[#1e232e] rounded-[40px] md:rounded-[60px] mx-4 md:mx-8"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-20">
              <div>
                <span className="text-[11px] uppercase tracking-[0.26em] text-[#4ec38e] font-bold block mb-4">
                  EMPAT PILAR SISTEM
                </span>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight leading-tight text-white">
                  Kendali penuh atas <br className="hidden sm:inline" />
                  <span className="font-serif italic font-normal text-[#34a875]">
                    arus kas
                  </span>{" "}
                  &amp; reputasi nelayan.
                </h2>
              </div>
              <p className="text-[#9aa3b2] text-xs md:text-sm max-w-sm font-light leading-relaxed">
                Dirancang khusus untuk ritme kerja pengepul ikan harian dengan
                keamanan Row Level Security (RLS) tingkat organisasi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  num: "01 / MULTIMODAL",
                  title: "Input Pintar Suara & Nota",
                  desc: "Bicara langsung dengan Web Speech API (id-ID), ketik cepat, atau foto nota kertas. AI menyusun draf transaksi siap konfirmasi.",
                  bullets: [
                    "Ekstraksi entitas nelayan & ikan",
                    "Wajib konfirmasi sebelum simpan",
                    "Arsip foto nota privat (RLS)",
                  ],
                  featured: false,
                },
                {
                  num: "02 / LEDGER",
                  title: "Buku Kas & Saldo Real-Time",
                  desc: "Hitung otomatis nilai tangkapan, catat pemberian kasbon baru maupun potongan cicilan saat nelayan menyetor ikan.",
                  bullets: [
                    "Kalkulasi otomatis berat × harga",
                    "Pantau sisa kasbon per nelayan",
                    "Riwayat transaksi transparan",
                  ],
                  featured: true,
                },
                {
                  num: "03 / MONITORING",
                  title: "Laporan Malam & Anomali",
                  desc: "Setiap pukul 21:00 WIB, cron job merangkum performa harian sekaligus mendeteksi kejanggalan statistik secara dini.",
                  bullets: [
                    "Deteksi penurunan harga ikan",
                    "Peringatan lonjakan kasbon",
                    "Deteksi outlier berat tangkapan",
                  ],
                  featured: false,
                },
                {
                  num: "04 / INCLUSION",
                  title: "Profil Kelayakan Kredit",
                  desc: "Menerjemahkan kedisiplinan setoran dan pelunasan kasbon menjadi skor 0–100 beserta narasi evaluasi bagi LKM/koperasi.",
                  bullets: [
                    "Skor objektif berbasis histori",
                    "Narasi evaluasi otomatis AI",
                    "Jembatan akses permodalan",
                  ],
                  featured: false,
                },
              ].map((card) => (
                <div
                  key={card.num}
                  className={`p-8 rounded-[32px] transition-colors duration-300 flex flex-col justify-between min-h-[420px] ${
                    card.featured
                      ? "bg-[#121c18] border-2 border-[#1f5c42]"
                      : "bg-[#11141b] border border-[#1e232e] hover:border-[#2e3646]"
                  }`}
                >
                  <div>
                    <span
                      className={`text-[10px] font-mono tracking-widest ${
                        card.featured ? "text-[#4ec38e]" : "text-[#8b94a5]"
                      }`}
                    >
                      {card.num}
                    </span>
                    <div className="h-[1px] bg-[#1e232e] my-5" />
                    <h3 className="text-xl font-semibold tracking-wide text-white mb-3.5">
                      {card.title}
                    </h3>
                    <p className="text-[#9aa3b2] text-xs leading-relaxed font-light mb-6">
                      {card.desc}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[#1e232e]">
                    <ul className="flex flex-col gap-1.5 text-[11px] text-[#cfd5df]">
                      {card.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. SOLID INTERACTIVE HUMAN-IN-THE-LOOP SIMULATOR */}
        <section id="simulasi" className="py-28 md:py-36">
          <div className="max-w-6xl mx-auto px-6 md:px-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-14">
              <div>
                <span className="text-[11px] uppercase tracking-[0.26em] text-[#4ec38e] font-bold block mb-4">
                  — SIMULASI ALUR KERJA
                </span>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white">
                  Uji bagaimana AI{" "}
                  <span className="font-serif italic font-normal text-[#34a875]">
                    memahami
                  </span>{" "}
                  bahasa dermaga.
                </h2>
              </div>

              {/* Mode Switcher Pills */}
              <div className="inline-flex rounded-full border border-[#1e232e] bg-[#11141b] p-1.5">
                {(Object.keys(INPUT_SAMPLES) as InputMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleModeSwitch(mode)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors duration-200 ${
                      activeMode === mode
                        ? "bg-[#158052] text-white font-semibold"
                        : "text-[#8b94a5] hover:text-white"
                    }`}
                  >
                    {INPUT_SAMPLES[mode].tabLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-[#1e232e] bg-[#0e1117] p-6 sm:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Raw Input Card */}
                <div className="lg:col-span-5 rounded-[24px] border border-[#1e232e] bg-[#090b0e] p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-6">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#6d7687]">
                        INPUT MENTAH
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-[#151922] border border-[#262c3a] font-mono text-[10px] text-[#4ec38e]">
                        {currentSample.badge}
                      </span>
                    </div>
                    <p className="font-serif italic text-xl md:text-2xl text-[#ececec] leading-relaxed">
                      {currentSample.quote}
                    </p>
                  </div>

                  <div className="mt-8 pt-5 border-t border-[#1e232e] text-xs text-[#9aa3b2] leading-relaxed">
                    <strong className="text-[#ececec]">Aturan Emas:</strong>{" "}
                    Hasil ekstraksi AI berstatus{" "}
                    <code className="text-[#d9a05b]">pending</code> hingga
                    pengguna menekan tombol konfirmasi.
                  </div>
                </div>

                {/* Structured Draft Output */}
                <div className="lg:col-span-7 rounded-[24px] border border-[#22382e] bg-[#111716] p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#4ec38e]">
                        DRAF TERSTRUKTUR (ZOD SCHEMA)
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full font-mono text-[10px] font-semibold ${
                          isConfirmed
                            ? "bg-[#158052] text-white"
                            : "bg-[#261f14] text-[#d9a05b] border border-[#3d311e]"
                        }`}
                      >
                        {isConfirmed
                          ? "TERSIMPAN DI BUKU KAS"
                          : "MENUNGGU KONFIRMASI"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                      <div className="rounded-2xl bg-[#151c1b] p-4 border border-[#222e2b]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8b94a5] block">
                          Profil Nelayan (RPC Match)
                        </span>
                        <span className="text-white font-semibold mt-1 block">
                          {currentSample.nelayan}
                        </span>
                        <span className="text-xs text-[#9aa3b2]">
                          {currentSample.kapal}
                        </span>
                      </div>

                      <div className="rounded-2xl bg-[#151c1b] p-4 border border-[#222e2b]">
                        <span className="text-[10px] uppercase tracking-wider text-[#8b94a5] block">
                          Kategori Transaksi
                        </span>
                        <span className="text-white font-semibold mt-1 block">
                          {currentSample.jenis}
                        </span>
                        <span className="text-xs text-[#9aa3b2]">
                          {currentSample.detail}
                        </span>
                      </div>

                      <div className="sm:col-span-2 rounded-2xl bg-[#0b100f] p-4 border border-[#22382e]">
                        <span className="text-[10px] uppercase tracking-wider text-[#4ec38e] block">
                          Hasil Perhitungan Deterministik Sistem
                        </span>
                        <span className="font-mono text-base sm:text-lg font-semibold text-white mt-1 block">
                          {currentSample.kalkulasi}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 flex items-center justify-end gap-3">
                    {isConfirmed ? (
                      <button
                        onClick={() => setIsConfirmed(false)}
                        className="px-5 py-2.5 rounded-full border border-[#262c3a] bg-[#151922] text-xs uppercase tracking-widest text-[#cfd5df] hover:text-white transition-colors"
                      >
                        Ulangi Simulasi
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsConfirmed(true)}
                        className="px-6 py-3 rounded-full bg-[#158052] hover:bg-[#19935f] text-white text-xs uppercase tracking-[0.18em] font-bold transition-colors"
                      >
                        Konfirmasi &amp; Bukukan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. CREDIT SCORE METHODOLOGY (4-STEP SOLID TIMELINE) */}
        <section
          id="kredit"
          className="py-24 md:py-32 bg-[#0c0f14] border-y border-[#1e232e]"
        >
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20 items-end">
              <div className="lg:col-span-6">
                <span className="text-[11px] uppercase tracking-[0.26em] text-[#4ec38e] font-bold block mb-4">
                  FORMULA SKOR KREDIT (0–100)
                </span>
                <h2 className="text-3xl md:text-5xl font-light tracking-tight leading-tight text-white">
                  Dari catatan harian menjadi{" "}
                  <span className="font-serif italic font-normal text-[#34a875]">
                    identitas finansial
                  </span>{" "}
                  yang terukur.
                </h2>
              </div>
              <p className="lg:col-span-6 text-[#9aa3b2] text-xs md:text-sm font-light leading-relaxed max-w-lg">
                Indikasi kelayakan kredit dihitung murni dari histori buku kas
                menggunakan empat bobot transparan yang dapat dikalibrasi
                bersama koperasi atau LKM mitra.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-[24px] left-0 right-0 h-[1px] bg-[#1e232e] z-0" />

              {[
                {
                  weight: "35%",
                  title: "Konsistensi Setoran",
                  desc: "Mengukur keteraturan minggu aktif menyetor ikan dan frekuensi transaksi setoran tangkapan (catch).",
                },
                {
                  weight: "30%",
                  title: "Rasio Kasbon vs Pendapatan",
                  desc: "Perbandingan sisa kasbon beredar (outstanding advance) terhadap total nilai hasil tangkapan nelayan.",
                },
                {
                  weight: "25%",
                  title: "Riwayat Pelunasan",
                  desc: "Proporsi kasbon yang berhasil dicicil atau dilunasi kembali dibandingkan total pinjaman yang diambil.",
                },
                {
                  weight: "10%",
                  title: "Lama Aktif Bertransaksi",
                  desc: "Rentang hari keaktifan nelayan sejak transaksi pertama kali tercatat di dalam buku kas organisasi.",
                },
              ].map((step) => (
                <div key={step.title} className="relative z-10 group">
                  <div className="w-14 h-12 rounded-full bg-[#11141b] border border-[#263b32] flex items-center justify-center text-[#4ec38e] font-mono text-xs font-bold mb-6 group-hover:bg-[#158052] group-hover:text-white group-hover:border-[#158052] transition-colors duration-200">
                    {step.weight}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3 tracking-wide">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#9aa3b2] leading-relaxed font-light">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. EDITORIAL FAQ ACCORDION */}
        <section id="faq" className="py-28 md:py-32">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-[11px] uppercase tracking-[0.26em] text-[#4ec38e] font-bold block mb-4">
                TRANSPARANSI SISTEM
              </span>
              <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white">
                Menjawab pertanyaan seputar{" "}
                <span className="font-serif italic font-normal text-[#34a875]">
                  TangkapanKu
                </span>
                .
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className={`rounded-3xl border transition-colors duration-200 bg-[#11141b] ${
                      isOpen ? "border-[#264739]" : "border-[#1e232e]"
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full px-7 py-6 text-left flex justify-between items-center gap-4"
                    >
                      <span className="text-sm md:text-base font-medium text-white">
                        {item.q}
                      </span>
                      <span
                        className={`w-8 h-8 shrink-0 rounded-full border border-[#262c3a] flex items-center justify-center text-xs text-[#4ec38e] transition-transform duration-200 ${
                          isOpen ? "rotate-180 bg-[#101c17]" : "bg-[#151922]"
                        }`}
                      >
                        ↓
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-7 pb-6 text-xs md:text-sm text-[#9aa3b2] font-light leading-relaxed border-t border-[#1e232e] pt-4">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 9. GRAND SOLID CTA & DEMO ACCESS CARD */}
        <section
          id="demo"
          className="py-20 md:py-28 bg-[#0e1219] border border-[#1e232e] rounded-[40px] md:rounded-[60px] mx-4 md:mx-8 mb-20"
        >
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#4ec38e] font-bold block mb-5">
              ORGANISASI DEMO: SAMUDRA JAYA
            </span>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] text-white mb-6">
              Rasakan pengalaman <br />
              buku kas pesisir{" "}
              <span className="font-serif italic font-normal text-[#34a875]">
                sekarang
              </span>
              .
            </h2>

            <p className="text-[#9aa3b2] text-xs md:text-base font-light max-w-xl mx-auto leading-relaxed mb-10">
              Gunakan kredensial pengepul demo berikut untuk menjelajahi
              transaksi tangkapan, laporan malam otomatis, deteksi anomali, dan
              skor kredit nelayan.
            </p>

            {/* Copyable Credentials Box */}
            <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-10">
              <div className="rounded-2xl border border-[#222834] bg-[#090b0e] px-5 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#6d7687] block">
                    Email Demo
                  </span>
                  <span className="font-mono text-xs sm:text-sm text-white mt-0.5 block">
                    admin@tangkapanku.com
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#222834] bg-[#090b0e] px-5 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#6d7687] block">
                    Password Demo
                  </span>
                  <span className="font-mono text-xs sm:text-sm text-white mt-0.5 block">
                    TangkapanKu123!
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="bg-[#158052] hover:bg-[#19935f] text-white text-xs uppercase tracking-[0.22em] font-bold py-4 px-9 rounded-full transition-colors duration-200"
              >
                Masuk ke Aplikasi &rarr;
              </Link>
              <Link
                href="/register"
                className="border border-[#262c3a] bg-[#151922] hover:bg-[#1d222e] text-white text-xs uppercase tracking-[0.22em] font-semibold py-4 px-8 rounded-full transition-colors duration-200"
              >
                Buat Akun Organisasi Baru
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 10. EDITORIAL SOLID FOOTER */}
      <footer className="border-t border-[#1e232e] py-16 md:py-20 bg-[#090b0e]">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-14">
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#151922] border border-[#262c3a] flex items-center justify-center">
                  <span className="font-serif italic text-sm text-[#4ec38e]">
                    Tk
                  </span>
                </div>
                <span className="text-xs font-bold tracking-[0.25em] text-white uppercase">
                  TANGKAPANKU
                </span>
              </div>
              <p className="text-xs text-[#8b94a5] leading-relaxed font-light max-w-sm">
                Buku kas digital berbasis AI untuk pengepul ikan pesisir.
                Mencatat transaksi secara multimodal, menjaga akurasi saldo
                kasbon, dan membuka akses pembiayaan nelayan.
              </p>
            </div>

            <div className="md:col-span-3">
              <h4 className="text-[10px] font-bold tracking-[0.25em] text-white uppercase mb-5">
                Navigasi
              </h4>
              <ul className="flex flex-col gap-3 text-xs text-[#8b94a5]">
                <li>
                  <a
                    href="#filosofi"
                    className="hover:text-white transition-colors"
                  >
                    Realitas &amp; Filosofi
                  </a>
                </li>
                <li>
                  <a
                    href="#fitur"
                    className="hover:text-white transition-colors"
                  >
                    Empat Pilar Sistem
                  </a>
                </li>
                <li>
                  <a
                    href="#simulasi"
                    className="hover:text-white transition-colors"
                  >
                    Simulasi AI
                  </a>
                </li>
                <li>
                  <a
                    href="#kredit"
                    className="hover:text-white transition-colors"
                  >
                    Rumus Skor Kredit
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <h4 className="text-[10px] font-bold tracking-[0.25em] text-white uppercase mb-5">
                Akses &amp; Catatan Data
              </h4>
              <p className="text-xs text-[#8b94a5] leading-relaxed font-light">
                Disarankan menggunakan Google Chrome atau Microsoft Edge untuk
                pengalaman rekam suara Bahasa Indonesia (Web Speech API) yang
                optimal. Seluruh data pada akun demo bersifat sintetis.
              </p>
            </div>
          </div>

          <div className="border-t border-[#1e232e] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-[#6d7687]">
            <span>TangkapanKu © 2026 • Coastal Digital Ledger</span>
            <span>Ditenagai Next.js, Supabase &amp; Gemini 2.5 Flash</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
