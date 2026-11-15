import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { calculateCreditScore } from "@/lib/credit-score";

const MODEL_NAME = "gemini-2.5-flash";

async function computeAndUpsertCreditProfile(
  fishermanId: string,
  orgId: string,
  fishermanName: string,
  fishermanCreatedAt: string,
) {
  const supabaseAdmin = createAdminClient();

  // 1. Ambil seluruh transaksi nelayan
  const { data: txns, error: txnError } = await supabaseAdmin
    .from("transactions")
    .select("type, amount, occurred_at")
    .eq("fisherman_id", fishermanId)
    .order("occurred_at", { ascending: true });

  if (txnError) {
    throw new Error(txnError.message);
  }

  // 2. Hitung skor dengan rumus berbobot deterministik
  const result = calculateCreditScore(txns || [], fishermanCreatedAt);

  // 3. Susun narasi dengan Gemini berdasarkan faktor yang sudah dihitung
  let narrative = `${fishermanName} memiliki skor indikatif ${result.score}/100 dengan total setoran Rp ${result.factors.details.total_catch_value.toLocaleString(
    "id-ID",
  )} dan sisa kasbon Rp ${result.factors.details.outstanding_advance.toLocaleString("id-ID")}.`;

  const apiKey = process.env.NEXT_GEMINI_API_KEY || process.env.AI_API_KEY;
  if (apiKey && (txns || []).length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Buat narasi evaluasi kelayakan kredit mikro untuk nelayan bernama "${fishermanName}" dalam 2-3 kalimat bahasa Indonesia yang objektif dan profesional untuk ditampilkan ke pengepul / lembaga keuangan mikro.
Data hasil perhitungan sistem:
- Skor Indikatif: ${result.score}/100
- Sub-skor Konsistensi Setoran (35%): ${result.factors.consistency}/100 (${result.factors.details.catch_count} kali setor dalam ${result.factors.details.active_weeks} minggu)
- Sub-skor Rasio Kasbon/Pendapatan (30%): ${result.factors.advance_ratio}/100 (sisa kasbon ${result.factors.details.advance_to_catch_pct}% dari total pendapatan)
- Sub-skor Riwayat Pelunasan (25%): ${result.factors.repayment_history}/100 (pelunasan ${result.factors.details.repayment_pct}%)
- Sub-skor Lama Aktif (10%): ${result.factors.active_duration}/100 (${result.factors.details.active_days} hari aktif)
- Total Setoran: Rp ${result.factors.details.total_catch_value.toLocaleString("id-ID")}
- Sisa Kasbon Beredar: Rp ${result.factors.details.outstanding_advance.toLocaleString("id-ID")}

Sebutkan kekuatan utama dan hal yang perlu diperhatikan jika ada. Jangan mengarang angka baru.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { temperature: 0.3 },
      });

      if (response.text?.trim()) {
        narrative = response.text.trim();
      }
    } catch (err) {
      console.error("Gemini Credit Narrative Error:", err);
    }
  }

  // 4. Upsert ke credit_profiles (menggunakan service role key karena RLS select-only)
  const { data: upserted, error: upsertError } = await supabaseAdmin
    .from("credit_profiles")
    .upsert(
      {
        org_id: orgId,
        fisherman_id: fishermanId,
        score: result.score,
        factors: result.factors,
        narrative,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "fisherman_id" },
    )
    .select()
    .single();

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return upserted;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fishermanId: string }> },
) {
  try {
    const { fishermanId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pastikan nelayan ada & milik organisasi user (terfilter RLS)
    const [fishermanRes, balanceRes, profileRes] = await Promise.all([
      supabase.from("fishermen").select("*").eq("id", fishermanId).single(),
      supabase
        .from("fisherman_balances")
        .select("*")
        .eq("fisherman_id", fishermanId)
        .maybeSingle(),
      supabase
        .from("credit_profiles")
        .select("*")
        .eq("fisherman_id", fishermanId)
        .maybeSingle(),
    ]);

    if (fishermanRes.error || !fishermanRes.data) {
      return NextResponse.json(
        { error: "Nelayan tidak ditemukan" },
        { status: 404 },
      );
    }

    let creditProfile = profileRes.data;

    // Jika belum pernah dihitung sama sekali, hitung otomatis agar tidak kosong
    if (!creditProfile) {
      creditProfile = await computeAndUpsertCreditProfile(
        fishermanRes.data.id,
        fishermanRes.data.org_id,
        fishermanRes.data.name,
        fishermanRes.data.created_at,
      );
    }

    return NextResponse.json({
      fisherman: fishermanRes.data,
      balance: {
        total_catch_value: Number(balanceRes.data?.total_catch_value || 0),
        total_advance: Number(balanceRes.data?.total_advance || 0),
        total_repayment: Number(balanceRes.data?.total_repayment || 0),
        outstanding_advance: Number(balanceRes.data?.outstanding_advance || 0),
      },
      creditProfile,
    });
  } catch (error) {
    console.error("GET /api/credit/[fishermanId] Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ fishermanId: string }> },
) {
  try {
    const { fishermanId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verifikasi akses user ke nelayan ini lewat RLS
    const { data: fisherman, error: fishError } = await supabase
      .from("fishermen")
      .select("id, org_id, name, created_at")
      .eq("id", fishermanId)
      .single();

    if (fishError || !fisherman) {
      return NextResponse.json(
        { error: "Nelayan tidak ditemukan" },
        { status: 404 },
      );
    }

    const updatedProfile = await computeAndUpsertCreditProfile(
      fisherman.id,
      fisherman.org_id,
      fisherman.name,
      fisherman.created_at,
    );

    return NextResponse.json(
      {
        message: "Profil kredit berhasil diperbarui",
        creditProfile: updatedProfile,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/credit/[fishermanId] Error:", error);
    return NextResponse.json(
      { error: "Gagal menghitung ulang profil kredit" },
      { status: 500 },
    );
  }
}
