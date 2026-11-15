export interface CreditTxn {
  type: "catch" | "advance" | "repayment";
  amount: number;
  occurred_at: string;
}

export interface CreditFactors {
  consistency: number; // Bobot 35%
  advance_ratio: number; // Bobot 30%
  repayment_history: number; // Bobot 25%
  active_duration: number; // Bobot 10%
  details: {
    active_weeks: number;
    catch_count: number;
    total_catch_value: number;
    total_advance: number;
    total_repayment: number;
    outstanding_advance: number;
    advance_to_catch_pct: number;
    repayment_pct: number;
    active_days: number;
  };
}

export interface CreditCalculationResult {
  score: number;
  factors: CreditFactors;
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

/**
 * Menghitung skor kredit indikatif (0-100) berdasarkan rumus berbobot MVP:
 * - Konsistensi setoran: 35%
 * - Rasio kasbon terhadap pendapatan: 30%
 * - Riwayat pelunasan: 25%
 * - Lama aktif: 10%
 */
export function calculateCreditScore(
  transactions: CreditTxn[],
  fishermanCreatedAt: string,
): CreditCalculationResult {
  if (!transactions || transactions.length === 0) {
    return {
      score: 0,
      factors: {
        consistency: 0,
        advance_ratio: 0,
        repayment_history: 0,
        active_duration: 0,
        details: {
          active_weeks: 0,
          catch_count: 0,
          total_catch_value: 0,
          total_advance: 0,
          total_repayment: 0,
          outstanding_advance: 0,
          advance_to_catch_pct: 0,
          repayment_pct: 0,
          active_days: 0,
        },
      },
    };
  }

  let totalCatchValue = 0;
  let totalAdvance = 0;
  let totalRepayment = 0;
  let catchCount = 0;

  const activeWeekKeys = new Set<string>();
  const timestamps: number[] = [];

  for (const t of transactions) {
    const amt = Number(t.amount || 0);
    const ts = new Date(t.occurred_at).getTime();
    if (!Number.isNaN(ts)) timestamps.push(ts);

    if (t.type === "catch") {
      totalCatchValue += amt;
      catchCount += 1;

      // Hitung minggu unik terjadinya setoran ikan
      const d = new Date(ts);
      const year = d.getUTCFullYear();
      const week = Math.floor(
        (ts - Date.UTC(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000),
      );
      activeWeekKeys.add(`${year}-W${week}`);
    } else if (t.type === "advance") {
      totalAdvance += amt;
    } else if (t.type === "repayment") {
      totalRepayment += amt;
    }
  }

  const outstandingAdvance = Math.max(0, totalAdvance - totalRepayment);

  // 1. Konsistensi Setoran (Bobot 35%)
  // Dinilai dari jumlah minggu aktif setor & frekuensi transaksi catch (target ideal >= 6 minggu / >= 12 setoran dalam 45 hari)
  const activeWeeks = activeWeekKeys.size;
  const weekScore = Math.min(100, (activeWeeks / 6) * 100);
  const freqScore = Math.min(100, (catchCount / 12) * 100);
  const consistency = clamp(weekScore * 0.6 + freqScore * 0.4);

  // 2. Rasio Kasbon terhadap Pendapatan (Bobot 30%)
  // Semakin kecil sisa kasbon dibandingkan total nilai tangkapan, semakin sehat
  let advanceRatioScore = 100;
  let advanceToCatchPct = 0;

  if (totalCatchValue <= 0) {
    advanceRatioScore = totalAdvance > 0 ? 15 : 50;
    advanceToCatchPct = totalAdvance > 0 ? 100 : 0;
  } else {
    advanceToCatchPct = (outstandingAdvance / totalCatchValue) * 100;
    // Jika sisa kasbon 0% -> skor 100; jika sisa kasbon >= 80% dari total pendapatan -> skor 10
    advanceRatioScore = clamp(100 - advanceToCatchPct * 1.15, 10, 100);
  }

  // 3. Riwayat Pelunasan (Bobot 25%)
  // Proporsi kasbon yang sudah dilunasi (repayment / totalAdvance)
  let repaymentHistoryScore = 85; // Skor netral-baik jika belum pernah berutang tapi aktif setor
  let repaymentPct = 100;

  if (totalAdvance > 0) {
    repaymentPct = Math.min(100, (totalRepayment / totalAdvance) * 100);
    repaymentHistoryScore = clamp(repaymentPct);
  } else if (catchCount === 0) {
    repaymentHistoryScore = 0;
    repaymentPct = 0;
  }

  // 4. Lama Aktif (Bobot 10%)
  // Dihitung dari transaksi pertama (atau created_at nelayan) hingga transaksi terakhir / hari ini (target 45 hari = 100)
  const earliestTxn =
    timestamps.length > 0
      ? Math.min(...timestamps)
      : new Date(fishermanCreatedAt).getTime();
  const latestTxn =
    timestamps.length > 0 ? Math.max(...timestamps, Date.now()) : Date.now();
  const activeDays = Math.max(
    1,
    Math.round((latestTxn - earliestTxn) / (24 * 60 * 60 * 1000)),
  );
  const activeDurationScore = clamp((activeDays / 45) * 100);

  // Skor Akhir Berbobot: 35% + 30% + 25% + 10%
  const weightedTotal =
    consistency * 0.35 +
    advanceRatioScore * 0.3 +
    repaymentHistoryScore * 0.25 +
    activeDurationScore * 0.1;

  return {
    score: clamp(weightedTotal),
    factors: {
      consistency,
      advance_ratio: advanceRatioScore,
      repayment_history: repaymentHistoryScore,
      active_duration: activeDurationScore,
      details: {
        active_weeks: activeWeeks,
        catch_count: catchCount,
        total_catch_value: Math.round(totalCatchValue),
        total_advance: Math.round(totalAdvance),
        total_repayment: Math.round(totalRepayment),
        outstanding_advance: Math.round(outstandingAdvance),
        advance_to_catch_pct: Number(advanceToCatchPct.toFixed(1)),
        repayment_pct: Number(repaymentPct.toFixed(1)),
        active_days: activeDays,
      },
    },
  };
}
