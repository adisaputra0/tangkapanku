import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  generateDailyReportForOrg,
  getTodayWIB,
} from "@/lib/reports/generate-daily-report";

export async function GET(request: Request) {
  try {
    // 1. Verifikasi CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized Cron Request" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const targetDate = searchParams.get("date") || getTodayWIB();

    const supabaseAdmin = createAdminClient();
    const { data: orgs, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name");

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }

    const results = [];
    for (const org of orgs || []) {
      const res = await generateDailyReportForOrg(org.id, targetDate);
      results.push({
        org_id: org.id,
        org_name: org.name,
        report_date: targetDate,
        anomalies_count: res.anomalies.length,
      });
    }

    return NextResponse.json(
      {
        message: "Cron laporan harian selesai dijalankan",
        date: targetDate,
        processed: results.length,
        results,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/cron/daily-report Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat laporan harian" },
      { status: 500 },
    );
  }
}
