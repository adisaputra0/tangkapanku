import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const transactionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("catch"),
    fisherman_id: z.string().uuid("Nelayan wajib dipilih"),
    species: z.string().min(1, "Jenis ikan wajib diisi"),
    weight_kg: z.number().positive("Berat harus lebih dari 0 kg"),
    price_per_kg: z.number().nonnegative("Harga per kg tidak valid"),
    note: z.string().optional().nullable(),
    occurred_at: z.string().optional(),
  }),
  z.object({
    type: z.literal("advance"),
    fisherman_id: z.string().uuid("Nelayan wajib dipilih"),
    amount: z.number().positive("Nominal kasbon harus lebih dari 0"),
    note: z.string().optional().nullable(),
    occurred_at: z.string().optional(),
  }),
  z.object({
    type: z.literal("repayment"),
    fisherman_id: z.string().uuid("Nelayan wajib dipilih"),
    amount: z.number().positive("Nominal pelunasan harus lebih dari 0"),
    note: z.string().optional().nullable(),
    occurred_at: z.string().optional(),
  }),
]);

type TransactionInsert = {
  org_id: string;
  fisherman_id: string;
  type: "catch" | "advance" | "repayment";
  species: string | null;
  weight_kg: number | null;
  price_per_kg: number | null;
  amount: number;
  note: string | null;
  occurred_at: string;
  source: "manual";
  created_by: string;
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fishermanId = searchParams.get("fisherman_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = supabase
      .from("transactions")
      .select(
        `
        id,
        fisherman_id,
        type,
        species,
        weight_kg,
        price_per_kg,
        amount,
        note,
        occurred_at,
        source,
        fishermen ( name, boat_name )
      `,
      )
      .order("occurred_at", { ascending: false });

    if (fishermanId && fishermanId !== "all") {
      query = query.eq("fisherman_id", fishermanId);
    }
    if (startDate) {
      query = query.gte("occurred_at", `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte("occurred_at", `${endDate}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transactions: data || [] }, { status: 200 });
  } catch (error) {
    console.error("GET Transactions Error:", error);
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
    const parsed = transactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validasi gagal",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
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

    const payload = parsed.data;
    const occurredAt = payload.occurred_at
      ? new Date(payload.occurred_at).toISOString()
      : new Date().toISOString();

    // Hitung amount secara deterministik untuk catch
    const insertData: TransactionInsert =
      payload.type === "catch"
        ? {
            org_id: membership.org_id,
            fisherman_id: payload.fisherman_id,
            type: "catch",
            species: payload.species.trim(),
            weight_kg: payload.weight_kg,
            price_per_kg: payload.price_per_kg,
            amount: Math.round(payload.weight_kg * payload.price_per_kg),
            note: payload.note?.trim() || null,
            occurred_at: occurredAt,
            source: "manual",
            created_by: user.id,
          }
        : {
            org_id: membership.org_id,
            fisherman_id: payload.fisherman_id,
            type: payload.type,
            species: null,
            weight_kg: null,
            price_per_kg: null,
            amount: Math.round(payload.amount),
            note: payload.note?.trim() || null,
            occurred_at: occurredAt,
            source: "manual",
            created_by: user.id,
          };

    const { data, error } = await supabase
      .from("transactions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Transaksi berhasil dicatat", transaction: data },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST Transaction Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
