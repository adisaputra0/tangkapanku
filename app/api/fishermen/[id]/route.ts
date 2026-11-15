import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateFishermanSchema = z.object({
  name: z.string().min(2, "Nama nelayan minimal 2 karakter").optional(),
  phone: z.string().nullable().optional(),
  boat_name: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
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
    const parsed = updateFishermanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validasi gagal",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updates: Record<string, any> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
    if (parsed.data.phone !== undefined)
      updates.phone = parsed.data.phone?.trim() || null;
    if (parsed.data.boat_name !== undefined)
      updates.boat_name = parsed.data.boat_name?.trim() || null;
    if (parsed.data.is_active !== undefined)
      updates.is_active = parsed.data.is_active;

    const { data, error } = await supabase
      .from("fishermen")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Data nelayan berhasil diperbarui", fisherman: data },
      { status: 200 },
    );
  } catch (error) {
    console.error("PATCH Fisherman Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
