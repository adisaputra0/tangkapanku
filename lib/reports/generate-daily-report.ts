import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL_NAME = "gemini-2.5-flash";

// Ambil tanggal hari ini dalam WIB (UTC+7) format YYYY-MM-DD
export function getTodayWIB(): string {
  const now = new Date();
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wibTime.toISOString().split("T")[0];
}

export async function generateDailyReportForOrg(
  orgId: string,
  reportDate: string,
) {
  const supabaseAdmin = createAdminClient();

  // Rentang waktu hari laporan (WIB -> UTC)
  const startUtc = new Date(`${reportDate}T00:00:00+07:00`).toISOString();
  const endUtc = new Date(`${reportDate}T23:59:59+07:00`).toISOString();

  // Rentang 14 hari sebelumnya sebagai baseline deteksi anomali statistik
  const baselineStartUtc = new Date(
    new Date(`${reportDate}T00:00:00+07:00`).getTime() -
      14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Ambil transaksi hari laporan & transaksi 14 hari sebelumnya
  const [todayTxnsRes, historyTxnsRes] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select(
        "id, fisherman_id, type, species, weight_kg, price_per_kg, amount, fishermen(name)",
      )
      .eq("org_id", orgId)
      .gte("occurred_at", startUtc)
      .lte("occurred_at", endUtc),
    supabaseAdmin
      .from("transactions")
      .select("fisherman_id, type, species, weight_kg, price_per_kg, amount")
      .eq("org_id", orgId)
      .gte("occurred_at", baselineStartUtc)
      .lt("occurred_at", startUtc),
  ]);

  const todayTxns = todayTxnsRes.data || [];
  const historyTxns = historyTxnsRes.data || [];

  // 2. Hitung metrik harian secara deterministik (rumus, bukan AI)
  let totalKg = 0;
  let totalValue = 0;
  let advanceIssued = 0;
  let repaymentReceived = 0;

  const speciesStats: Record<
    string,
    { totalKg: number; totalValue: number; count: number }
  > = {};

  for (const t of todayTxns) {
    if (t.type === "catch") {
      const w = Number(t.weight_kg || 0);
      const amt = Number(t.amount || 0);
      totalKg += w;
      totalValue += amt;

      const sp = t.species || "Lainnya";
      if (!speciesStats[sp]) {
        speciesStats[sp] = { totalKg: 0, totalValue: 0, count: 0 };
      }
      speciesStats[sp].totalKg += w;
      speciesStats[sp].totalValue += amt;
      speciesStats[sp].count += 1;
    } else if (t.type === "advance") {
      advanceIssued += Number(t.amount || 0);
    } else if (t.type === "repayment") {
      repaymentReceived += Number(t.amount || 0);
    }
  }

  // Rata-rata harga per kg per jenis ikan & jenis ikan teratas
  const avgPrice: Record<string, number> = {};
  let topSpecies: string | null = null;
  let maxSpeciesKg = 0;

  for (const [species, stat] of Object.entries(speciesStats)) {
    avgPrice[species] =
      stat.totalKg > 0 ? Math.round(stat.totalValue / stat.totalKg) : 0;
    if (stat.totalKg > maxSpeciesKg) {
      maxSpeciesKg = stat.totalKg;
      topSpecies = species;
    }
  }

  const metrics = {
    total_kg: Number(totalKg.toFixed(2)),
    total_value: Math.round(totalValue),
    advance_issued: Math.round(advanceIssued),
    repayment_received: Math.round(repaymentReceived),
    transaction_count: todayTxns.length,
    top_species: topSpecies,
    avg_price: avgPrice,
  };

  // 3. Deteksi Anomali Berbasis Statistik (price_drop, advance_spike, weight_outlier)
  const detectedAnomalies: {
    org_id: string;
    report_date: string;
    fisherman_id: string | null;
    kind: string;
    severity: number;
    detail: Record<string, any>;
  }[] = [];

  // 3a. Cek penurunan harga ikan > 15% dibanding rata-rata 14 hari terakhir
  const histSpeciesPrices: Record<string, number[]> = {};
  const histWeights: number[] = [];

  for (const h of historyTxns) {
    if (h.type === "catch") {
      if (h.species && h.price_per_kg) {
        if (!histSpeciesPrices[h.species]) histSpeciesPrices[h.species] = [];
        histSpeciesPrices[h.species].push(Number(h.price_per_kg));
      }
      if (h.weight_kg) histWeights.push(Number(h.weight_kg));
    }
  }

  for (const [species, currentAvg] of Object.entries(avgPrice)) {
    const prevList = histSpeciesPrices[species];
    if (prevList && prevList.length > 0 && currentAvg > 0) {
      const prevAvg = prevList.reduce((a, b) => a + b, 0) / prevList.length;
      const changePct = ((currentAvg - prevAvg) / prevAvg) * 100;

      if (changePct <= -15) {
        detectedAnomalies.push({
          org_id: orgId,
          report_date: reportDate,
          fisherman_id: null,
          kind: "price_drop",
          severity: changePct <= -25 ? 3 : 2,
          detail: {
            species,
            previous_price: Math.round(prevAvg),
            current_price: currentAvg,
            change_percent: Number(changePct.toFixed(2)),
            message: `Harga ${species} turun ${Math.abs(changePct).toFixed(1)}% (Rp ${currentAvg.toLocaleString("id-ID")}/kg vs rata-rata Rp ${Math.round(prevAvg).toLocaleString("id-ID")}/kg).`,
          },
        });
      }
    }
  }

  // 3b. Cek lonjakan kasbon (advance > 1.8x rata-rata kasbon 14 hari terakhir atau >= Rp 500.000 jika belum ada histori)
  const histAdvances = historyTxns
    .filter((h) => h.type === "advance")
    .map((h) => Number(h.amount));
  const avgAdvance =
    histAdvances.length > 0
      ? histAdvances.reduce((a, b) => a + b, 0) / histAdvances.length
      : 250000;

  for (const t of todayTxns) {
    if (t.type === "advance") {
      const amt = Number(t.amount);
      if (amt >= avgAdvance * 1.8 && amt >= 400000) {
        const fisherName = (t.fishermen as any)?.name || "Nelayan";
        detectedAnomalies.push({
          org_id: orgId,
          report_date: reportDate,
          fisherman_id: t.fisherman_id,
          kind: "advance_spike",
          severity: amt >= avgAdvance * 2.5 ? 3 : 2,
          detail: {
            amount: amt,
            average_advance: Math.round(avgAdvance),
            message: `Kasbon ${fisherName} sebesar Rp ${amt.toLocaleString("id-ID")} melonjak di atas rata-rata harian (Rp ${Math.round(avgAdvance).toLocaleString("id-ID")}).`,
          },
        });
      }
    }

    // 3c. Cek weight_outlier (setoran ikan > 2x rata-rata berat)
    if (t.type === "catch" && t.weight_kg && histWeights.length > 0) {
      const avgWeight =
        histWeights.reduce((a, b) => a + b, 0) / histWeights.length;
      const w = Number(t.weight_kg);
      if (w >= avgWeight * 2.2) {
        const fisherName = (t.fishermen as any)?.name || "Nelayan";
        detectedAnomalies.push({
          org_id: orgId,
          report_date: reportDate,
          fisherman_id: t.fisherman_id,
          kind: "weight_outlier",
          severity: 1,
          detail: {
            species: t.species,
            weight_kg: w,
            average_weight: Number(avgWeight.toFixed(1)),
            message: `Setoran ${t.species} oleh ${fisherName} (${w} kg) jauh di atas rata-rata (${avgWeight.toFixed(1)} kg).`,
          },
        });
      }
    }
  }

  // 4. Buat Narasi AI dari metrik & anomali yang sudah dihitung
  let narrative =
    todayTxns.length === 0
      ? "Belum ada transaksi tercatat pada tanggal ini."
      : `Total tangkapan ${metrics.total_kg} kg senilai Rp ${metrics.total_value.toLocaleString("id-ID")} dengan kasbon keluar Rp ${metrics.advance_issued.toLocaleString("id-ID")}.`;

  const apiKey = process.env.NEXT_GEMINI_API_KEY || process.env.AI_API_KEY;
  if (apiKey && todayTxns.length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Buat ringkasan laporan malam operasional pengepul ikan dalam 2-3 kalimat bahasa Indonesia yang padat, ramah, dan actionable berdasarkan metrik berikut:
Tanggal: ${reportDate}
Metrik: ${JSON.stringify(metrics)}
Anomali terdeteksi: ${JSON.stringify(detectedAnomalies.map((a) => a.detail.message))}
Jangan mengarang angka di luar data di atas.`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { temperature: 0.3 },
      });

      if (response.text?.trim()) {
        narrative = response.text.trim();
      }
    } catch (err) {
      console.error("Gemini Daily Report Narrative Error:", err);
      // Tetap lanjut menggunakan fallback narrative deterministik
    }
  }

  // 5. Upsert ke daily_reports & refresh anomalies tanggal tersebut
  const { data: savedReport, error: reportError } = await supabaseAdmin
    .from("daily_reports")
    .upsert(
      {
        org_id: orgId,
        report_date: reportDate,
        metrics,
        narrative,
        model: MODEL_NAME,
      },
      { onConflict: "org_id,report_date" },
    )
    .select()
    .single();

  if (reportError) {
    throw new Error(reportError.message);
  }

  // Hapus anomali lama di tanggal yang sama agar idempoten saat tombol demo diklik ulang
  await supabaseAdmin
    .from("anomalies")
    .delete()
    .eq("org_id", orgId)
    .eq("report_date", reportDate);

  if (detectedAnomalies.length > 0) {
    await supabaseAdmin.from("anomalies").insert(detectedAnomalies);
  }

  return {
    report: savedReport,
    anomalies: detectedAnomalies,
  };
}
