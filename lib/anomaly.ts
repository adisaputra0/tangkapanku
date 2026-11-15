export interface TxnRecord {
  fisherman_id: string;
  fisherman_name?: string;
  type: "catch" | "advance" | "repayment";
  species: string | null;
  weight_kg: number | null;
  price_per_kg: number | null;
  amount: number;
}

export interface DetectedAnomaly {
  fisherman_id: string | null;
  kind: "price_drop" | "advance_spike" | "weight_outlier";
  severity: 1 | 2 | 3;
  detail: Record<string, any>;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * 1. Deteksi Penurunan Harga (price_drop)
 * Membandingkan harga rata-rata tertimbang hari ini vs rata-rata 7 hari terakhir per spesies.
 */
export function detectPriceDrops(
  todayTxns: TxnRecord[],
  last7DaysTxns: TxnRecord[],
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  // Hitung rata-rata harga hari ini per spesies
  const todaySpecies: Record<string, { totalValue: number; totalKg: number }> =
    {};
  for (const t of todayTxns) {
    if (t.type === "catch" && t.species && t.weight_kg && t.price_per_kg) {
      if (!todaySpecies[t.species]) {
        todaySpecies[t.species] = { totalValue: 0, totalKg: 0 };
      }
      todaySpecies[t.species].totalValue +=
        Number(t.weight_kg) * Number(t.price_per_kg);
      todaySpecies[t.species].totalKg += Number(t.weight_kg);
    }
  }

  // Kumpulkan histori harga 7 hari terakhir per spesies
  const historyPrices: Record<string, number[]> = {};
  for (const h of last7DaysTxns) {
    if (
      h.type === "catch" &&
      h.species &&
      h.price_per_kg &&
      Number(h.price_per_kg) > 0
    ) {
      if (!historyPrices[h.species]) historyPrices[h.species] = [];
      historyPrices[h.species].push(Number(h.price_per_kg));
    }
  }

  for (const [species, stat] of Object.entries(todaySpecies)) {
    const prevPrices = historyPrices[species];
    if (!prevPrices || prevPrices.length === 0 || stat.totalKg <= 0) continue;

    const currentAvg = stat.totalValue / stat.totalKg;
    const prevAvg7d = mean(prevPrices);
    if (prevAvg7d <= 0) continue;

    const changePercent = ((currentAvg - prevAvg7d) / prevAvg7d) * 100;

    // Anomali jika harga turun >= 15% dari rata-rata 7 hari terakhir
    if (changePercent <= -15) {
      const severity: 1 | 2 | 3 =
        changePercent <= -30 ? 3 : changePercent <= -20 ? 2 : 1;

      anomalies.push({
        fisherman_id: null,
        kind: "price_drop",
        severity,
        detail: {
          species,
          previous_price: Math.round(prevAvg7d),
          current_price: Math.round(currentAvg),
          change_percent: Number(changePercent.toFixed(2)),
          window_days: 7,
          message: `Harga ${species} turun ${Math.abs(changePercent).toFixed(1)}% (Rp ${Math.round(
            currentAvg,
          ).toLocaleString("id-ID")}/kg vs rata-rata 7 hari Rp ${Math.round(
            prevAvg7d,
          ).toLocaleString("id-ID")}/kg).`,
        },
      });
    }
  }

  return anomalies;
}

/**
 * 2. Deteksi Lonjakan Kasbon (advance_spike)
 * Membandingkan kasbon nelayan hari ini dengan rata-rata kasbon historis nelayan tersebut.
 */
export function detectAdvanceSpikes(
  todayTxns: TxnRecord[],
  historyTxns: TxnRecord[],
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  // Kelompokkan histori kasbon per nelayan & global
  const fishermanAdvances: Record<string, number[]> = {};
  const globalAdvances: number[] = [];

  for (const h of historyTxns) {
    if (h.type === "advance" && Number(h.amount) > 0) {
      const amt = Number(h.amount);
      globalAdvances.push(amt);
      if (!fishermanAdvances[h.fisherman_id]) {
        fishermanAdvances[h.fisherman_id] = [];
      }
      fishermanAdvances[h.fisherman_id].push(amt);
    }
  }

  const globalAvg = globalAdvances.length > 0 ? mean(globalAdvances) : 250000;

  for (const t of todayTxns) {
    if (t.type !== "advance") continue;

    const amount = Number(t.amount);
    const personalHist = fishermanAdvances[t.fisherman_id] || [];
    const baselineAvg =
      personalHist.length > 0 ? mean(personalHist) : globalAvg;
    const ratio = baselineAvg > 0 ? amount / baselineAvg : 1;

    // Anomali jika kasbon >= 1.75x rata-rata nelayan tersebut dan minimal Rp 350.000
    if (ratio >= 1.75 && amount >= 350000) {
      const severity: 1 | 2 | 3 = ratio >= 2.5 ? 3 : ratio >= 2.0 ? 2 : 1;
      const name = t.fisherman_name || "Nelayan";

      anomalies.push({
        fisherman_id: t.fisherman_id,
        kind: "advance_spike",
        severity,
        detail: {
          amount: Math.round(amount),
          fisherman_avg_advance: Math.round(baselineAvg),
          multiplier: Number(ratio.toFixed(2)),
          message: `Kasbon ${name} sebesar Rp ${Math.round(
            amount,
          ).toLocaleString(
            "id-ID",
          )} melonjak ${ratio.toFixed(1)}× di atas rata-rata kasbonnya (Rp ${Math.round(
            baselineAvg,
          ).toLocaleString("id-ID")}).`,
        },
      });
    }
  }

  return anomalies;
}

/**
 * 3. Deteksi Outlier Berat Tangkapan (weight_outlier)
 * Menggunakan statistik Mean + 2 SD (atau >= 2.2x rata-rata jika sampel kecil) per jenis ikan.
 */
export function detectWeightOutliers(
  todayTxns: TxnRecord[],
  historyTxns: TxnRecord[],
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = [];

  const speciesWeights: Record<string, number[]> = {};
  for (const h of historyTxns) {
    if (
      h.type === "catch" &&
      h.species &&
      h.weight_kg &&
      Number(h.weight_kg) > 0
    ) {
      if (!speciesWeights[h.species]) speciesWeights[h.species] = [];
      speciesWeights[h.species].push(Number(h.weight_kg));
    }
  }

  for (const t of todayTxns) {
    if (t.type !== "catch" || !t.species || !t.weight_kg) continue;

    const hist = speciesWeights[t.species] || [];
    if (hist.length < 3) continue; // Butuh minimal 3 data historis untuk statistik valid

    const w = Number(t.weight_kg);
    const avgW = mean(hist);
    const sdW = stdDev(hist);
    const threshold =
      sdW > 0 ? Math.max(avgW + 2 * sdW, avgW * 1.8) : avgW * 2.2;

    if (w >= threshold) {
      const zScore = sdW > 0 ? (w - avgW) / sdW : w / avgW;
      const severity: 1 | 2 | 3 = zScore >= 3 ? 2 : 1;
      const name = t.fisherman_name || "Nelayan";

      anomalies.push({
        fisherman_id: t.fisherman_id,
        kind: "weight_outlier",
        severity,
        detail: {
          species: t.species,
          weight_kg: w,
          average_weight_kg: Number(avgW.toFixed(1)),
          z_score: Number(zScore.toFixed(2)),
          message: `Setoran ${t.species} oleh ${name} (${w} kg) jauh melebihi rata-rata normal (${avgW.toFixed(
            1,
          )} kg).`,
        },
      });
    }
  }

  return anomalies;
}

/**
 * Fungsi Orkestrator Utama: menjalankan seluruh detektor statistik secara deterministik.
 */
export function detectAllAnomalies(
  todayTxns: TxnRecord[],
  last7DaysTxns: TxnRecord[],
  fullHistoryTxns: TxnRecord[],
): DetectedAnomaly[] {
  return [
    ...detectPriceDrops(todayTxns, last7DaysTxns),
    ...detectAdvanceSpikes(todayTxns, fullHistoryTxns),
    ...detectWeightOutliers(todayTxns, fullHistoryTxns),
  ];
}
