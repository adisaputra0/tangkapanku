import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const registerSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  org_name: z.string().min(2, "Nama usaha/pengepul wajib diisi"),
  location: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validasi gagal",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password, org_name, location } = parsed.data;
    const supabaseAdmin = createAdminClient();

    // 1. Buat user di Supabase Auth (langsung terkonfirmasi agar lancar saat demo)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Gagal membuat akun pengguna" },
        { status: 400 },
      );
    }

    const userId = authData.user.id;

    // 2. Buat Organisasi (Pengepul)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: org_name,
        location: location || null,
        created_by: userId,
      })
      .select("id, name, location")
      .single();

    if (orgError || !orgData) {
      // Rollback: hapus user jika gagal buat organisasi
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Gagal membuat profil organisasi pengepul" },
        { status: 500 },
      );
    }

    // 3. Tambahkan user sebagai 'owner' di org_members
    const { error: memberError } = await supabaseAdmin
      .from("org_members")
      .insert({
        org_id: orgData.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      // Rollback: hapus organisasi dan user
      await supabaseAdmin.from("organizations").delete().eq("id", orgData.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Gagal menghubungkan akun dengan organisasi" },
        { status: 500 },
      );
    }

    // 4. Langsung set session cookie dengan signInWithPassword
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { message: "Registrasi berhasil, silakan login manual." },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        message: "Registrasi berhasil",
        user: {
          id: userId,
          email: authData.user.email,
        },
        organization: orgData,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 },
    );
  }
}
