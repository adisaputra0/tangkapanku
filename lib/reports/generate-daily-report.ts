import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/lib/supabase/server";
import { detectAllAnomalies, TxnRecord } from "@/lib/anomaly";

const MODEL_NAME = "gemini-2.5-flash";

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

  const dayStartMs = new Date(`${reportDate}T00:00:00+07:00`).getTime();
  const startUtc = new Date(dayStartMs).toISOString();
  const endUtc = new Date(`${reportDate}T23:59:59+07:00`).toISOString();

  // Window 7 hari untuk price_drop & 30 hari untuk baseline kasbon/berat nelayan
  const sevenDaysAgoUtc = new Date(
    dayStartMs - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgoUtc = new Date(
    dayStartMs - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 1. Ambil transaksi hari laporan & transaksi historis 30 hari terakhir
  const [todayTxnsRes, history30dRes] = await Promise.all([
    supabaseAdmin
      .from("transactions")
      .select(
        "id, fisherman_id, type, species, weight_kg, price_per_kg, amount, occurred_at, fishermen(name)",
      )
      .eq("org_id", orgId)
      .gte("occurred_at", startUtc)
      .lte("occurred_at", endUtc),
    supabaseAdmin
      .from("transactions")
      .select(
        "fisherman_id, type, species, weight_kg, price_per_kg, amount, occurred_at",
      )
      .eq("org_id", orgId)
      .gte("occurred_at", thirtyDaysAgoUtc)
      .lt("occurred_at", startUtc),
  ]);

  const rawToday = todayTxnsRes.data || [];
  const rawHistory30d = history30dRes.data || [];

  // Map ke tipe TxnRecord murni untuk lib/anomaly.ts
  const todayRecords: TxnRecord[] = rawToday.map((t) => ({
    fisherman_id: t.fisherman_id,
    fisherman_name: (t.fishermen as any)?.name || "Nelayan",
    type: t.type,
    species: t.species,
    weight_kg: t.weight_kg ? Number(t.weight_kg) : null,
    price_per_kg: t.price_per_kg ? Number(t.price_per_kg) : null,
    amount: Number(t.amount),
  }));

  const fullHistoryRecords: TxnRecord[] = rawHistory30d.map((h) => ({
    fisherman_id: h.fisherman_id,
    type: h.type,
    species: h.species,
    weight_kg: h.weight_kg ? Number(h.weight_kg) : null,
    price_per_kg: h.price_per_kg ? Number(h.price_per_kg) : null,
    amount: Number(h.amount),
  }));

  const last7DaysRecords: TxnRecord[] = rawHistory30d
    .filter((h) => h.occurred_at >= sevenDaysAgoUtc)
    .map((h) => ({
      fisherman_id: h.fisherman_id,
      type: h.type,
      species: h.species,
      weight_kg: h.weight_kg ? Number(h.weight_kg) : null,
      price_per_kg: h.price_per_kg ? Number(h.price_per_kg) : null,
      amount: Number(h.amount),
    }));

  // 2. Hitung metrik harian secara deterministik
  let totalKg = 0;
  let totalValue = 0;
  let advanceIssued = 0;
  let repaymentReceived = 0;
  const speciesStats: Record<string, { totalKg: number; totalValue: number }> =
    {};

  for (const t of todayRecords) {
    if (t.type === "catch") {
      const w = t.weight_kg || 0;
      totalKg += w;
      totalValue += t.amount;

      const sp = t.species || "Lainnya";
      if (!speciesStats[sp]) speciesStats[sp] = { totalKg: 0, totalValue: 0 };
      speciesStats[sp].totalKg += w;
      speciesStats[sp].totalValue += t.amount;
    } else if (t.type === "advance") {
      advanceIssued += t.amount;
    } else if (t.type === "repayment") {
      repaymentReceived += t.amount;
    }
  }

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
    transaction_count: todayRecords.length,
    top_species: topSpecies,
    avg_price: avgPrice,
  };

  // 3. Jalankan fungsi statistik murni dari lib/anomaly.ts
  const statisticalAnomalies = detectAllAnomalies(
    todayRecords,
    last7DaysRecords,
    fullHistoryRecords,
  );

  const anomalyRows = statisticalAnomalies.map((a) => ({
    org_id: orgId,
    report_date: reportDate,
    fisherman_id: a.fisherman_id,
    kind: a.kind,
    severity: a.severity,
    detail: a.detail,
  }));

  // 4. Narasi AI dari metrik & anomali
  let narrative =
    todayRecords.length === 0
      ? "Belum ada transaksi tercatat pada tanggal ini."
      : `Total tangkapan ${metrics.total_kg} kg senilai Rp ${metrics.total_value.toLocaleString(
          "id-ID",
        )} dengan kasbon keluar Rp ${metrics.advance_issued.toLocaleString("id-ID")}.`;

  const apiKey = process.env.NEXT_GEMINI_API_KEY || process.env.AI_API_KEY;
  if (apiKey && todayRecords.length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Buat ringkasan laporan malam operasional pengepul ikan dalam 2-3 kalimat bahasa Indonesia yang padat dan actionable berdasarkan metrik berikut:
Tanggal: ${reportDate}
Metrik: ${JSON.stringify(metrics)}
Anomali terdeteksi: ${JSON.stringify(anomalyRows.map((a) => a.detail.message))}
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
      console.error("Gemini Narrative Error:", err);
    }
  }

  // 5. Simpan ke daily_reports & anomalies
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

  await supabaseAdmin
    .from("anomalies")
    .delete()
    .eq("org_id", orgId)
    .eq("report_date", reportDate);

  if (anomalyRows.length > 0) {
    await supabaseAdmin.from("anomalies").insert(anomalyRows);
  }

  return {
    report: savedReport,
    anomalies: anomalyRows,
  };
}
