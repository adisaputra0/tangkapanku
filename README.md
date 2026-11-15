# TangkapanKu

> **Buku kas digital untuk pengepul ikan. Cukup bicara atau foto nota, AI mencatat, melaporkan, dan membangun riwayat kredit nelayan.**

---

## 📖 Deskripsi Proyek

Pengepul ikan di wilayah pesisir umumnya masih mencatat setoran tangkapan dan kasbon (pinjaman) nelayan di buku tulis fisik. Akibatnya, saldo utang sulit dilacak, selisih pencatatan sering terjadi, dan nelayan tidak memiliki riwayat keuangan formal untuk mengakses pembiayaan dari lembaga keuangan mikro (LKM) atau koperasi.

**TangkapanKu** hadir sebagai sistem operasional buku kas digital berbasis AI untuk pengepul ikan.

### Fitur Utama

1. **Input Pintar Multimodal (Suara, Teks, Foto Nota)** Pengepul cukup berbicara (Web Speech API Bahasa Indonesia), mengetik catatan singkat, atau memfoto nota tulis tangan. AI mengekstrak transaksi menjadi **draf terstruktur** yang wajib dikonfirmasi pengguna sebelum masuk ke buku kas (_human-in-the-loop_).
2. **Buku Kas & Saldo Real-Time** Menghitung otomatis nilai tangkapan (`berat × harga`), mencatat kasbon dan pelunasan, serta menampilkan sisa kasbon beredar per nelayan.
3. **Laporan Malam Otomatis & Deteksi Anomali** Setiap pukul 21:00 WIB, sistem menghitung ringkasan operasional harian, mendeteksi anomali statistik (penurunan harga ikan, lonjakan kasbon, dan _outlier_ berat tangkapan), serta menyusun ringkasan narasi.
4. **Profil Kelayakan Kredit Nelayan (Indikatif)** Menghitung skor kelayakan kredit (0–100) dari histori transaksi aktual dan menyusun narasi evaluasi untuk membantu nelayan mengakses permodalan.

---

## 🛠️ Tech Stack

| Kategori                     | Teknologi                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**                | Next.js (App Router) & TypeScript                                                                                                 |
| **Styling & Visualisasi**    | Tailwind CSS & Recharts                                                                                                           |
| **Database, Auth & Storage** | Supabase (PostgreSQL + `pg_trgm`, Supabase Auth, Private Storage Bucket `receipts`, Row Level Security / RLS)                     |
| **AI & Validasi**            | Google Gemini API (`@google/genai`, model `gemini-2.5-flash`), Zod (validasi skema _structured output_), Web Speech API (`id-ID`) |
| **Deployment & Scheduling**  | Vercel & Vercel Cron Jobs                                                                                                         |

---

## 🚀 Cara Menjalankan di Lokal

### 1. Prasyarat

- Node.js versi 18+
- Akun & proyek [Supabase](https://supabase.com/)
- API Key [Google AI Studio (Gemini)](https://aistudio.google.com/)

### 2. Instalasi Dependensi

```bash
git clone <url-repository-ini>
cd tangkapanku
npm install
```

### 3. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env`, lalu isi kredensial yang sesuai:

```bash
cp .env.example .env
```

### 4. Setup Database & Storage di Supabase

1. Buka **SQL Editor** di dashboard Supabase, lalu jalankan seluruh skrip berikut:
   - skema tabel: `organizations`, `org_members`, `fishermen`, `ai_inputs`, `transactions`, `daily_reports`, `anomalies`, `credit_profiles`
   - view `fisherman_balances`
   - kebijakan **RLS**
   - fungsi RPC `match_fisherman`
2. Buka menu **Storage** di Supabase, buat bucket baru bernama **`receipts`** dengan status **Private**, lalu aktifkan policy baca/tulis untuk anggota organisasi.
3. Daftarkan satu akun pengguna melalui halaman `/register` (atau Supabase Auth), lalu jalankan skrip SQL _seeder_ di SQL Editor untuk mengisi data demo dan laporan awal.

### 5. Jalankan Server Pengembangan

```bash
npm run dev
```

Buka `http://localhost:3000` di browser. Disarankan menggunakan Google Chrome atau Edge agar fitur rekam suara (Web Speech API) berjalan optimal.

---

## 🔑 Akun Demo

Untuk menguji aplikasi secara langsung tanpa mendaftar dari awal, gunakan akun pengepul demo berikut. Akun ini sudah terisi data organisasi **Samudra Jaya (Demo)** beserta riwayat transaksi, laporan malam, anomali, dan profil kredit nelayan.

|                  |                          |
| ---------------- | ------------------------ |
| **URL Aplikasi** | `tangkapanku.vercel.app` |
| **Email**        | `admin@tangkapanku.com`  |
| **Password**     | `TangkapanKu123!`        |

---

## 🤖 Transparansi Penggunaan AI (Orisinalitas & Model)

### 1. Peran Tim & AI Coding Assistant

- **Ide & Konsep Utama:** Gagasan solusi, perumusan masalah pesisir, alur operasional pengepul, serta rancangan fitur inti **TangkapanKu** merupakan ide orisinal yang dicetuskan sendiri oleh tim kami.
- **Claude (Anthropic):** Digunakan sebagai rekan diskusi untuk mempertajam dan mengembangkan ide awal menjadi spesifikasi teknis MVP, perancangan struktur tabel, dan alur pengguna.
- **Gemini (Google):** Digunakan sebagai _AI coding assistant_ untuk membantu implementasi kode frontend, Route Handlers API Next.js, validasi Zod, dan integrasi database.

### 2. Model AI di Dalam Aplikasi

- **Model:** `gemini-2.5-flash` (melalui Google GenAI SDK `@google/genai` di sisi server).

### 3. Batasan Tanggung Jawab: AI vs Rumus Deterministik

| Dikerjakan oleh         | Cakupan                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI**                  | Ekstraksi data tidak terstruktur (suara/teks/foto nota) menjadi draf JSON, serta penyusunan narasi ringkasan laporan harian dan profil kredit. |
| **Rumus deterministik** | Seluruh perhitungan keuangan (`amount = berat × harga`), agregasi saldo kasbon, deteksi anomali statistik, dan perhitungan angka skor kredit.  |

> **Aturan Emas:** AI tidak pernah menyimpan transaksi langsung ke buku kas. Seluruh hasil ekstraksi AI berstatus `pending` hingga diperiksa dan dikonfirmasi secara eksplisit oleh pengguna.

---

## 📊 Asumsi Rumus Skor Kredit Nelayan

Skor kelayakan kredit pada TangkapanKu bernilai **0–100** dan dilabeli sebagai **indikasi kelayakan kredit** (bukan keputusan kredit final). Skor dihitung secara deterministik dari riwayat buku kas menggunakan bobot berikut:

| Komponen Penilaian                   | Bobot | Dasar Perhitungan                                                                        |
| ------------------------------------ | ----- | ---------------------------------------------------------------------------------------- |
| **Konsistensi Setoran**              | 35%   | Keteraturan minggu aktif menyetor ikan dan frekuensi transaksi setoran (_catch_).        |
| **Rasio Kasbon terhadap Pendapatan** | 30%   | Perbandingan sisa kasbon beredar (_outstanding advance_) terhadap total nilai tangkapan. |
| **Riwayat Pelunasan**                | 25%   | Proporsi kasbon yang telah dibayar/dicicil kembali (_repayment / total advance_).        |
| **Lama Aktif Bertransaksi**          | 10%   | Rentang hari keaktifan nelayan sejak transaksi pertama tercatat di buku kas.             |

> **Catatan:** Bobot di atas merupakan asumsi awal MVP yang dirancang transparan dan dapat dikalibrasi lebih lanjut bersama koperasi atau lembaga keuangan mikro (LKM) mitra.

---

## 🧪 Pernyataan Data Sintetis

Seluruh data nelayan, nama kapal, catatan transaksi tangkapan, kasbon, laporan harian, dan skor kredit yang ditampilkan pada akun demo maupun skrip _seeding_ di repositori ini adalah **data sintetis (simulasi)** yang dibuat khusus untuk keperluan demonstrasi dan pengujian fungsionalitas sistem.
