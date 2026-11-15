import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [fishermanRes, balanceRes, transactionsRes, creditRes] =
      await Promise.all([
        supabase.from("fishermen").select("*").eq("id", id).single(),
        supabase
          .from("fisherman_balances")
          .select("*")
          .eq("fisherman_id", id)
          .maybeSingle(),
        supabase
          .from("transactions")
          .select("*")
          .eq("fisherman_id", id)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("credit_profiles")
          .select("*")
          .eq("fisherman_id", id)
          .maybeSingle(),
      ]);

    if (fishermanRes.error || !fishermanRes.data) {
      return NextResponse.json(
        { error: "Nelayan tidak ditemukan" },
        { status: 404 },
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
      creditProfile: creditRes.data || null,
      transactions: transactionsRes.data || [],
    });
  } catch (error) {
    console.error("GET Fisherman Detail Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
