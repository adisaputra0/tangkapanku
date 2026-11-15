import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validasi gagal",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const supabase = await createClient();

    // 1. Autentikasi ke Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    // 2. Ambil data organisasi milik user (otomatis terfilter RLS)
    const { data: membership } = await supabase
      .from("org_members")
      .select(
        `
        role,
        organizations (
          id,
          name,
          location
        )
      `,
      )
      .eq("user_id", authData.user.id)
      .single();

    return NextResponse.json(
      {
        message: "Login berhasil",
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        role: membership?.role || null,
        organization: membership?.organizations || null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 },
    );
  }
}
