import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Cek sesi user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Ambil info organisasi user
    const { data: membership } = await supabase
      .from("org_members")
      .select("role, organizations ( id, name, location )")
      .eq("user_id", user.id)
      .single();

    if (!membership?.organizations) {
      return NextResponse.json(
        { error: "Organisasi tidak ditemukan" },
        { status: 404 },
      );
    }

    // 3. Jalankan query secara paralel untuk performa maksimal
    const [
      balancesRes,
      creditsRes,
      transactionsRes,
      latestReportRes,
      anomaliesRes,
      pendingDraftsRes,
    ] = await Promise.all([
      // Saldo per nelayan (dari view fisherman_balances)
      supabase.from("fisherman_balances").select("*").order("name"),
      // Profil kredit nelayan
      supabase.from("credit_profiles").select("fisherman_id, score"),
      // Transaksi 14 hari terakhir untuk kalkulasi chart tren harga
      supabase
        .from("transactions")
        .select(
          "id, type, species, weight_kg, price_per_kg, amount, occurred_at",
        )
        .order("occurred_at", { ascending: true }),
      // Laporan malam terbaru
      supabase
        .from("daily_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Anomali terbaru
      supabase
        .from("anomalies")
        .select("*, fishermen(name)")
        .order("report_date", { ascending: false })
        .limit(5),
      // Jumlah draf AI yang belum dikonfirmasi
      supabase
        .from("ai_inputs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    const balances = balancesRes.data || [];
    const credits = creditsRes.data || [];
    const transactions = transactionsRes.data || [];

    // 4. Hitung ringkasan KPI
    const summary = balances.reduce(
      (acc, item) => ({
        total_catch_value:
          acc.total_catch_value + Number(item.total_catch_value || 0),
        total_advance: acc.total_advance + Number(item.total_advance || 0),
        total_repayment:
          acc.total_repayment + Number(item.total_repayment || 0),
        outstanding_advance:
          acc.outstanding_advance + Number(item.outstanding_advance || 0),
      }),
      {
        total_catch_value: 0,
        total_advance: 0,
        total_repayment: 0,
        outstanding_advance: 0,
      },
    );

    // 5. Gabungkan saldo nelayan dengan skor kreditnya
    const creditMap = new Map(credits.map((c) => [c.fisherman_id, c.score]));
    const fishermenSummary = balances.map((b) => ({
      ...b,
      credit_score: creditMap.get(b.fisherman_id) ?? null,
    }));

    // 6. Olah data tren harga per tanggal untuk Recharts
    const priceTrendMap: Record<string, Record<string, number>> = {};
    transactions
      .filter((t) => t.type === "catch" && t.species && t.price_per_kg)
      .forEach((t) => {
        const date = new Date(t.occurred_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        });
        if (!priceTrendMap[date]) priceTrendMap[date] = {};
        priceTrendMap[date][t.species!] = Number(t.price_per_kg);
      });

    const priceTrends = Object.entries(priceTrendMap).map(
      ([date, speciesPrices]) => ({
        date,
        ...speciesPrices,
      }),
    );

    return NextResponse.json({
      organization: membership.organizations,
      summary: {
        ...summary,
        active_fishermen: balances.length,
        pending_drafts: pendingDraftsRes.count || 0,
      },
      fishermen: fishermenSummary,
      priceTrends,
      latestReport: latestReportRes.data,
      anomalies: anomaliesRes.data || [],
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
