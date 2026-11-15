import { NextResponse } from "next/server";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { DraftSchema, Draft, EnrichedDraftItem } from "@/lib/schemas/draft";
import { checkRateLimit } from "@/lib/rate-limit";

const MODEL_NAME = "gemini-2.5-flash";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const geminiResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description:
        "Daftar transaksi yang diekstrak dari catatan suara, teks, atau foto nota.",
      items: {
        type: Type.OBJECT,
        properties: {
          fisherman_name: {
            type: Type.STRING,
            description:
              "Nama nelayan yang disebut (tanpa sapaan seperti Pak/Bang jika memungkinkan).",
          },
          type: {
            type: Type.STRING,
            enum: ["catch", "advance", "repayment"],
            description:
              "catch = setor ikan, advance = pinjam kasbon, repayment = bayar/cicil kasbon.",
          },
          species: {
            type: Type.STRING,
            nullable: true,
            description:
              "Jenis ikan (misal: Tongkol, Tuna, Cakalang). Null jika bukan catch.",
          },
          weight_kg: {
            type: Type.NUMBER,
            nullable: true,
            description:
              "Berat ikan dalam kilogram. Null jika bukan catch atau tidak disebut.",
          },
          price_per_kg: {
            type: Type.NUMBER,
            nullable: true,
            description:
              "Harga beli per kg dalam Rupiah penuh (misal: 28 ribu -> 28000).",
          },
          amount: {
            type: Type.NUMBER,
            description:
              "Nominal uang dalam Rupiah penuh (misal: 200 ribu -> 200000).",
          },
          note: {
            type: Type.STRING,
            nullable: true,
            description: "Keterangan tambahan singkat jika ada.",
          },
        },
        required: [
          "fisherman_name",
          "type",
          "species",
          "weight_kg",
          "price_per_kg",
          "amount",
          "note",
        ],
      },
    },
    confidence: {
      type: Type.NUMBER,
      description: "Tingkat keyakinan ekstraksi antara 0.0 hingga 1.0.",
    },
    unclear: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Daftar hal yang kurang jelas atau hilang (misal: harga belum disebutkan).",
    },
  },
  required: ["items", "confidence", "unclear"],
};

async function callGeminiWithRetry(
  ai: GoogleGenAI,
  contents: any[],
  maxRetries = 1,
): Promise<Draft> {
  const systemInstruction = `Kamu adalah asisten pencatat buku kas digital pengepul ikan bernama TangkapanKu.
Ekstrak input ucapan, teks, atau foto nota tulis tangan menjadi transaksi terstruktur:
- "catch": nelayan menyetor hasil tangkapan ikan.
- "advance": nelayan mengambil pinjaman/kasbon (uang, solar, es, rokok, perbekalan).
- "repayment": nelayan membayar/melunasi/mengangsur kasbon.
Konversi singkatan bahasa Indonesia lisan ke angka penuh (contoh: "28 ribu" = 28000, "1,5 juta" = 1500000, "setengah kilo" = 0.5).
Jika ada informasi yang meragukan atau tidak lengkap (seperti berat atau harga tidak tertulis), masukkan penjelasannya ke array "unclear" dan turunkan nilai "confidence".`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: geminiResponseSchema,
          temperature: 0.1,
        },
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Respons kosong dari Gemini");

      const json = JSON.parse(rawText);
      return DraftSchema.parse(json);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  throw lastError;
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

    // 1. Rate Limit per user (maks 15 request / menit)
    const rate = checkRateLimit(user.id, 15, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Coba lagi dalam ${rate.retryAfterSec} detik.`,
        },
        { status: 429 },
      );
    }

    // 2. Ambil org_id user
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
    const orgId = membership.org_id;

    // 3. Parse FormData (mendukung teks, suara transkrip, dan foto nota)
    const formData = await request.formData();
    const rawText = (formData.get("text") as string | null)?.trim() || "";
    const sourceRaw = (formData.get("source") as string | null) || "text";
    const imageFile = formData.get("image") as File | null;

    const validSources = ["text", "voice", "photo"] as const;
    const source = validSources.includes(sourceRaw as any)
      ? (sourceRaw as "text" | "voice" | "photo")
      : imageFile
        ? "photo"
        : "text";

    if (!rawText && (!imageFile || imageFile.size === 0)) {
      return NextResponse.json(
        { error: "Masukkan teks/suara atau unggah foto nota terlebih dahulu." },
        { status: 400 },
      );
    }

    // 4. Validasi & Upload Foto ke Storage bucket receipts/{org_id}/...
    let imagePath: string | null = null;
    const contents: any[] = [];

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: "Format gambar harus JPG, PNG, atau WebP." },
          { status: 400 },
        );
      }

      if (imageFile.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Ukuran gambar maksimal 4 MB." },
          { status: 400 },
        );
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = imageFile.type.split("/")[1] || "jpg";
      const fileName = `${orgId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, buffer, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage Upload Error:", uploadError);
        return NextResponse.json(
          { error: "Gagal mengunggah foto nota ke penyimpanan." },
          { status: 500 },
        );
      }

      imagePath = fileName;

      contents.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: imageFile.type,
        },
      });
    }

    if (rawText) {
      contents.push(rawText);
    } else if (imagePath) {
      contents.push("Ekstrak seluruh catatan transaksi dari foto nota ini.");
    }

    // 5. Panggil Gemini API dengan Structured Output + Zod + Retry 1x
    const apiKey = process.env.NEXT_GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Konfigurasi API Key Gemini belum diatur di server." },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    let draftResult: Draft;

    try {
      draftResult = await callGeminiWithRetry(ai, contents, 1);
    } catch (aiErr) {
      console.error("Gemini Parse Failed after retry:", aiErr);
      return NextResponse.json(
        {
          error:
            "AI gagal memproses catatan ini. Silakan coba lagi atau gunakan input manual.",
          fallback_manual: true,
        },
        { status: 502 },
      );
    }

    // 6. Kalkulasi ulang amount di server & Pencocokan fuzzy nama nelayan (pg_trgm)
    const unclearNotes = [...draftResult.unclear];
    const enrichedItems: EnrichedDraftItem[] = [];

    for (const item of draftResult.items) {
      // Jangan percaya perkalian AI: hitung ulang amount di server untuk catch
      let verifiedAmount = Math.round(item.amount || 0);

      if (item.type === "catch") {
        if (
          item.weight_kg &&
          item.weight_kg > 0 &&
          item.price_per_kg !== null &&
          item.price_per_kg >= 0
        ) {
          verifiedAmount = Math.round(item.weight_kg * item.price_per_kg);
        } else {
          verifiedAmount = 0;
          unclearNotes.push(
            `Berat atau harga ikan untuk ${item.fisherman_name} belum lengkap.`,
          );
        }
      }

      // Fuzzy match nama nelayan dengan RPC match_fisherman
      const cleanName = item.fisherman_name
        .replace(/^(pak|bapak|bang|mas|bli|ibu|bu)\s+/i, "")
        .trim();
      const { data: matches } = await supabase.rpc("match_fisherman", {
        _org_id: orgId,
        _query: cleanName || item.fisherman_name,
      });

      const bestMatch = matches && matches.length > 0 ? matches[0] : null;
      const isConfidentMatch = bestMatch && bestMatch.similarity >= 0.35;

      if (!isConfidentMatch) {
        unclearNotes.push(
          `Nama nelayan "${item.fisherman_name}" perlu dipilih manual.`,
        );
      }

      enrichedItems.push({
        ...item,
        amount: verifiedAmount,
        matched_fisherman_id: isConfidentMatch ? bestMatch.id : null,
        matched_fisherman_name: isConfidentMatch ? bestMatch.name : null,
        match_confidence: bestMatch
          ? Number(bestMatch.similarity.toFixed(2))
          : 0,
        needs_manual_fisherman: !isConfidentMatch,
      });
    }

    const finalParsedPayload = {
      items: enrichedItems,
      confidence: draftResult.confidence,
      unclear: Array.from(new Set(unclearNotes)),
    };

    // 7. Simpan draf ke ai_inputs dengan status 'pending'
    const { data: savedDraft, error: insertError } = await supabase
      .from("ai_inputs")
      .insert({
        org_id: orgId,
        source,
        raw_text: rawText || null,
        image_path: imagePath,
        parsed: finalParsedPayload,
        confidence: draftResult.confidence,
        status: "pending",
        model: MODEL_NAME,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert ai_inputs Error:", insertError);
      return NextResponse.json(
        { error: "Gagal menyimpan draf transaksi AI." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Draf transaksi berhasil dibuat",
        draft: savedDraft,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/ai/parse Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 },
    );
  }
}
