import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json({ message: "Logout berhasil" }, { status: 200 });
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { error: "Gagal melakukan logout" },
      { status: 500 },
    );
  }
}
