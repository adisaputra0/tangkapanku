import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createFishermanSchema = z.object({
  name: z.string().min(2, "Nama nelayan minimal 2 karakter"),
  phone: z.string().optional().nullable(),
  boat_name: z.string().optional().nullable(),
});

// Helper ambil org_id user saat ini
async function getUserOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .single();
  return data?.org_id || null;
}

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

    // Ambil profil nelayan & saldo secara paralel (terfilter RLS otomatis)
    const [fishermenRes, balancesRes] = await Promise.all([
      supabase
        .from("fishermen")
        .select("id, name, phone, boat_name, is_active, created_at")
        .order("is_active", { ascending: false })
        .order("name", { ascending: true }),
      supabase
        .from("fisherman_balances")
        .select(
          "fisherman_id, total_catch_value, total_advance, total_repayment, outstanding_advance",
        ),
    ]);

    if (fishermenRes.error) {
      return NextResponse.json(
        { error: fishermenRes.error.message },
        { status: 500 },
      );
    }

    const balanceMap = new Map(
      (balancesRes.data || []).map((b) => [b.fisherman_id, b]),
    );

    const merged = (fishermenRes.data || []).map((f) => {
      const bal = balanceMap.get(f.id);
      return {
        ...f,
        total_catch_value: Number(bal?.total_catch_value || 0),
        total_advance: Number(bal?.total_advance || 0),
        total_repayment: Number(bal?.total_repayment || 0),
        outstanding_advance: Number(bal?.outstanding_advance || 0),
      };
    });

    return NextResponse.json({ fishermen: merged }, { status: 200 });
  } catch (error) {
    console.error("GET Fishermen Error:", error);
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

    const body = await request.json();
    const parsed = createFishermanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validasi gagal",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const orgId = await getUserOrgId(supabase, user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "Organisasi tidak ditemukan" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("fishermen")
      .insert({
        org_id: orgId,
        name: parsed.data.name.trim(),
        phone: parsed.data.phone?.trim() || null,
        boat_name: parsed.data.boat_name?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Nelayan berhasil ditambahkan", fisherman: data },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST Fishermen Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
