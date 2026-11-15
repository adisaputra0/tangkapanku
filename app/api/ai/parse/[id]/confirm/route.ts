import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const confirmItemSchema = z.object({
  fisherman_id: z.string().uuid("Nelayan wajib dipilih untuk setiap item"),
  type: z.enum(["catch", "advance", "repayment"]),
  species: z.string().nullable().optional(),
  weight_kg: z.number().nullable().optional(),
  price_per_kg: z.number().nullable().optional(),
  amount: z.number().nonnegative(),
  note: z.string().nullable().optional(),
});

const confirmBodySchema = z.object({
  action: z.enum(["confirm", "reject"]),
  items: z.array(confirmItemSchema).optional(),
});

export async function POST(
  request: Request,
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

    const body = await request.json();
    const parsed = confirmBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Data konfirmasi tidak valid. Pastikan semua nelayan dan nominal terisi.",
        },
        { status: 400 },
      );
    }

    // 1. Ambil draf dari ai_inputs
    const { data: draft, error: draftError } = await supabase
      .from("ai_inputs")
      .select("*")
      .eq("id", id)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: "Draf tidak ditemukan" },
        { status: 404 },
      );
    }

    if (draft.status !== "pending") {
      return NextResponse.json(
        { error: `Draf ini sudah diproses (${draft.status})` },
        { status: 400 },
      );
    }

    // 2. Jika ditolak (reject)
    if (parsed.data.action === "reject") {
      await supabase
        .from("ai_inputs")
        .update({ status: "rejected" })
        .eq("id", id);

      return NextResponse.json({ message: "Draf ditolak" }, { status: 200 });
    }

    // 3. Jika dikonfirmasi (confirm)
    const items = parsed.data.items || [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Minimal harus ada 1 item transaksi" },
        { status: 400 },
      );
    }

    const txnRows = [];
    for (const item of items) {
      if (item.type === "catch") {
        if (!item.species?.trim()) {
          return NextResponse.json(
            { error: "Jenis ikan wajib diisi untuk setoran" },
            { status: 400 },
          );
        }
        if (
          !item.weight_kg ||
          item.weight_kg <= 0 ||
          item.price_per_kg === null ||
          item.price_per_kg === undefined ||
          item.price_per_kg < 0
        ) {
          return NextResponse.json(
            { error: "Berat (kg) dan harga/kg harus valid" },
            { status: 400 },
          );
        }

        txnRows.push({
          org_id: draft.org_id,
          fisherman_id: item.fisherman_id,
          type: "catch" as const,
          species: item.species.trim(),
          weight_kg: item.weight_kg,
          price_per_kg: item.price_per_kg,
          amount: Math.round(item.weight_kg * item.price_per_kg),
          note: item.note?.trim() || null,
          source: draft.source,
          ai_input_id: draft.id,
          created_by: user.id,
        });
      } else {
        if (item.amount <= 0) {
          return NextResponse.json(
            { error: "Nominal kasbon/pelunasan harus lebih dari 0" },
            { status: 400 },
          );
        }

        txnRows.push({
          org_id: draft.org_id,
          fisherman_id: item.fisherman_id,
          type: item.type,
          species: null,
          weight_kg: null,
          price_per_kg: null,
          amount: Math.round(item.amount),
          note: item.note?.trim() || null,
          source: draft.source,
          ai_input_id: draft.id,
          created_by: user.id,
        });
      }
    }

    // 4. Insert ke tabel transactions
    const { error: insertError } = await supabase
      .from("transactions")
      .insert(txnRows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. Update status ai_inputs menjadi 'confirmed'
    await supabase
      .from("ai_inputs")
      .update({ status: "confirmed" })
      .eq("id", id);

    return NextResponse.json(
      { message: `${txnRows.length} transaksi berhasil disimpan ke buku kas!` },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST Confirm Draft Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
