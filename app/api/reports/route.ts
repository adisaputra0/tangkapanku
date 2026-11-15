import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateDailyReportForOrg,
  getTodayWIB,
} from "@/lib/reports/generate-daily-report";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [reportsRes, anomaliesRes] = await Promise.all([
      supabase
        .from("daily_reports")
        .select("*")
        .order("report_date", { ascending: false })
        .limit(30),
      supabase
        .from("anomalies")
        .select("*, fishermen(name)")
        .order("report_date", { ascending: false })
        .order("severity", { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      reports: reportsRes.data || [],
      anomalies: anomaliesRes.data || [],
    });
  } catch (error) {
    console.error("GET /api/reports Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!membership?.org_id) {
      return NextResponse.json(
        { error: "Organisasi tidak ditemukan" },
        { status: 403 },
      );
    }

    let targetDate = getTodayWIB();
    try {
      const body = await request.json();
      if (body?.date) targetDate = body.date;
    } catch {
      // Gunakan default hari ini jika body kosong
    }

    const result = await generateDailyReportForOrg(
      membership.org_id,
      targetDate,
    );

    return NextResponse.json(
      {
        message: `Laporan tanggal ${targetDate} berhasil dibuat`,
        report: result.report,
        anomalies: result.anomalies,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/reports Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat laporan sekarang" },
      { status: 500 },
    );
  }
}
