-- ============================================================================
-- Seed Data: supabase/seed.sql
-- Deskripsi: Data sintetis 45 hari untuk demo TangkapanKu
--            - 9 Nelayan, 6 Jenis Ikan (Tongkol, Tenggiri, Kembung, Cakalang, Layang, Teri)
--            - ±180+ transaksi selama 45 hari terakhir
--            - Skenario bermakna: kasbon Budi melonjak, harga Tongkol turun,
--              Ahmad skor kredit tinggi, Budi skor kredit rendah
-- ============================================================================

DO $$
DECLARE
  v_user UUID;
  v_org UUID;

  -- 9 Nelayan
  v_ahmad  UUID;
  v_budi   UUID;
  v_joko   UUID;
  v_wayan  UUID;
  v_made   UUID;
  v_komang UUID;
  v_ketut  UUID;
  v_nyoman UUID;
  v_hendra UUID;

  -- AI Input IDs
  v_ai_confirmed UUID;

  -- Loop variables untuk generator 45 hari
  v_day INT;
  v_txn_date TIMESTAMPTZ;
  v_species TEXT;
  v_base_price NUMERIC;
  v_price NUMERIC;
  v_weight NUMERIC;
  v_amount NUMERIC;
  v_fisherman_arr UUID[];
  v_chosen_fisherman UUID;
  v_idx INT;
BEGIN
  -- 1. Ambil user pertama yang terdaftar
  SELECT id INTO v_user
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Belum ada user di auth.users. Silakan register akun terlebih dahulu.';
  END IF;

  -- 2. Buat / ambil organisasi demo
  SELECT id INTO v_org
  FROM organizations
  WHERE name = 'Samudra Jaya (Demo)'
    AND created_by = v_user
  LIMIT 1;

  IF v_org IS NULL THEN
    INSERT INTO organizations (name, location, created_by)
    VALUES ('Samudra Jaya (Demo)', 'Kedonganan, Bali', v_user)
    RETURNING id INTO v_org;
  END IF;

  INSERT INTO org_members (org_id, user_id, role)
  VALUES (v_org, v_user, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;

  -- 3. Bersihkan data seed sebelumnya agar aman dijalankan berulang kali (idempoten)
  DELETE FROM transactions WHERE org_id = v_org AND note LIKE '[DEMO-SEED%';
  DELETE FROM ai_inputs WHERE org_id = v_org;
  DELETE FROM anomalies WHERE org_id = v_org;
  DELETE FROM daily_reports WHERE org_id = v_org;

  -- 4. Insert 9 Nelayan
  INSERT INTO fishermen (org_id, name, phone, boat_name, is_active)
  SELECT v_org, d.name, d.phone, d.boat, true
  FROM (VALUES
    ('Ahmad Santoso',      '081234567801', 'KM Bintang Laut'),
    ('Budi Hartono',       '081234567802', 'KM Sinar Pagi'),
    ('Joko Prasetyo',      '081234567803', 'KM Mina Sejahtera'),
    ('I Wayan Suardika',   '081234567804', 'KM Segara Indah'),
    ('I Made Arya',        '081234567805', 'KM Laut Biru'),
    ('I Komang Putra',     '081234567806', 'KM Samudra Raya'),
    ('I Ketut Wijaya',     '081234567807', 'KM Bahari Jaya'),
    ('I Nyoman Sutrisna',  '081234567808', 'KM Nelayan Mandiri'),
    ('Hendra Gunawan',     '081234567809', 'KM Nusantara 02')
  ) AS d(name, phone, boat)
  WHERE NOT EXISTS (
    SELECT 1 FROM fishermen f WHERE f.org_id = v_org AND f.name = d.name
  );

  SELECT id INTO v_ahmad  FROM fishermen WHERE org_id = v_org AND name = 'Ahmad Santoso';
  SELECT id INTO v_budi   FROM fishermen WHERE org_id = v_org AND name = 'Budi Hartono';
  SELECT id INTO v_joko   FROM fishermen WHERE org_id = v_org AND name = 'Joko Prasetyo';
  SELECT id INTO v_wayan  FROM fishermen WHERE org_id = v_org AND name = 'I Wayan Suardika';
  SELECT id INTO v_made   FROM fishermen WHERE org_id = v_org AND name = 'I Made Arya';
  SELECT id INTO v_komang FROM fishermen WHERE org_id = v_org AND name = 'I Komang Putra';
  SELECT id INTO v_ketut  FROM fishermen WHERE org_id = v_org AND name = 'I Ketut Wijaya';
  SELECT id INTO v_nyoman FROM fishermen WHERE org_id = v_org AND name = 'I Nyoman Sutrisna';
  SELECT id INTO v_hendra FROM fishermen WHERE org_id = v_org AND name = 'Hendra Gunawan';

  v_fisherman_arr := ARRAY[
    v_ahmad, v_budi, v_joko, v_wayan, v_made,
    v_komang, v_ketut, v_nyoman, v_hendra
  ];

  -- 5. Buat riwayat input AI (1 confirmed, 2 pending untuk demo layar konfirmasi)
  INSERT INTO ai_inputs (
    org_id, source, raw_text, parsed,
    confidence, status, model, created_by
  )
  VALUES (
    v_org,
    'voice',
    'Pak Ahmad setor 40 kilo tongkol harga 28 ribu, sama kasbon 200 ribu buat solar.',
    '{
      "items": [
        {
          "fisherman_name": "Ahmad Santoso",
          "type": "catch",
          "species": "Tongkol",
          "weight_kg": 40,
          "price_per_kg": 28000,
          "amount": 1120000,
          "note": "Setoran pagi"
        },
        {
          "fisherman_name": "Ahmad Santoso",
          "type": "advance",
          "species": null,
          "weight_kg": null,
          "price_per_kg": null,
          "amount": 200000,
          "note": "Kasbon solar"
        }
      ],
      "confidence": 0.97,
      "unclear": []
    }'::jsonb,
    0.97,
    'confirmed',
    'gemini-2.5-flash',
    v_user
  )
  RETURNING id INTO v_ai_confirmed;

  INSERT INTO ai_inputs (
    org_id, source, raw_text, parsed,
    confidence, status, model, created_by
  )
  VALUES
  (
    v_org,
    'voice',
    'Pak Komang setor 35 kilo cakalang harga 32 ribu, terus nyicil kasbon 150 ribu.',
    '{
      "items": [
        {
          "fisherman_name": "I Komang Putra",
          "type": "catch",
          "species": "Cakalang",
          "weight_kg": 35,
          "price_per_kg": 32000,
          "amount": 1120000,
          "note": null
        },
        {
          "fisherman_name": "I Komang Putra",
          "type": "repayment",
          "species": null,
          "weight_kg": null,
          "price_per_kg": null,
          "amount": 150000,
          "note": "Cicilan kasbon"
        }
      ],
      "confidence": 0.94,
      "unclear": []
    }'::jsonb,
    0.94,
    'pending',
    'gemini-2.5-flash',
    v_user
  ),
  (
    v_org,
    'text',
    'Pak Nyoman setor tenggiri 22 kilo, harga belum deal.',
    '{
      "items": [
        {
          "fisherman_name": "I Nyoman Sutrisna",
          "type": "catch",
          "species": "Tenggiri",
          "weight_kg": 22,
          "price_per_kg": 65000,
          "amount": 1430000,
          "note": "Estimasi harga pasar"
        }
      ],
      "confidence": 0.78,
      "unclear": ["Harga per kg belum disebutkan secara eksplisit, menggunakan estimasi Rp 65.000/kg."]
    }'::jsonb,
    0.78,
    'pending',
    'gemini-2.5-flash',
    v_user
  );

  -- 6. Generator Transaksi 45 Hari Terakhir (Day 45 s/d Day 2 yang lalu)
  --    Menggunakan 6 jenis ikan: Tongkol, Tenggiri, Kembung, Cakalang, Layang, Teri
  FOR v_day IN REVERSE 45..2 LOOP
    -- Setiap hari menghasilkan 3 sampai 5 transaksi setoran ikan
    FOR v_idx IN 1..(3 + (v_day % 3)) LOOP
      v_txn_date := (CURRENT_DATE - v_day) + TIME '06:30:00' + ((v_idx * 45) || ' minutes')::interval;

      -- Pilih nelayan secara bergilir dengan variasi
      v_chosen_fisherman := v_fisherman_arr[1 + ((v_day * 3 + v_idx * 2) % 9)];

      -- Pilih salah satu dari 6 jenis ikan & tentukan harga dasar
      CASE (v_day + v_idx) % 6
        WHEN 0 THEN v_species := 'Tongkol';  v_base_price := 29000;
        WHEN 1 THEN v_species := 'Tenggiri'; v_base_price := 65000;
        WHEN 2 THEN v_species := 'Kembung';  v_base_price := 25000;
        WHEN 3 THEN v_species := 'Cakalang'; v_base_price := 33000;
        WHEN 4 THEN v_species := 'Layang';   v_base_price := 22000;
        ELSE        v_species := 'Teri';     v_base_price := 40000;
      END CASE;

      -- Fluktuasi harga wajar (-1500 s/d +2000)
      v_price  := v_base_price + (((v_day * 7 + v_idx * 13) % 8 - 3) * 500);
      -- Berat tangkapan realistis (15 kg s/d 55 kg)
      v_weight := 15 + ((v_day * 5 + v_idx * 11) % 41);
      v_amount := ROUND(v_weight * v_price);

      INSERT INTO transactions (
        org_id, fisherman_id, type, species,
        weight_kg, price_per_kg, amount,
        note, occurred_at, source, created_by
      )
      VALUES (
        v_org, v_chosen_fisherman, 'catch', v_species,
        v_weight, v_price, v_amount,
        '[DEMO-SEED-45D] Setoran ' || lower(v_species),
        v_txn_date,
        CASE WHEN v_idx = 1 THEN 'voice'::input_source ELSE 'manual'::input_source END,
        v_user
      );
    END LOOP;

    -- Tambah transaksi kasbon (advance) berkala tiap 2 hari
    IF v_day % 2 = 0 THEN
      v_chosen_fisherman := v_fisherman_arr[1 + ((v_day * 2) % 9)];
      -- Budi cenderung ambil kasbon lebih sering & besar
      IF v_chosen_fisherman = v_budi THEN
        v_amount := 450000;
      ELSE
        v_amount := 150000 + ((v_day % 3) * 50000);
      END IF;

      INSERT INTO transactions (
        org_id, fisherman_id, type,
        amount, note, occurred_at, source, created_by
      )
      VALUES (
        v_org, v_chosen_fisherman, 'advance',
        v_amount,
        '[DEMO-SEED-45D] Kasbon perbekalan & solar',
        (CURRENT_DATE - v_day) + TIME '14:15:00',
        'manual', v_user
      );
    END IF;

    -- Tambah transaksi pelunasan (repayment) tiap 3 hari (kecuali Budi jarang melunasi)
    IF v_day % 3 = 0 THEN
      v_chosen_fisherman := v_fisherman_arr[1 + ((v_day + 1) % 9)];
      IF v_chosen_fisherman <> v_budi THEN
        v_amount := 200000 + ((v_day % 2) * 100000);
        INSERT INTO transactions (
          org_id, fisherman_id, type,
          amount, note, occurred_at, source, created_by
        )
        VALUES (
          v_org, v_chosen_fisherman, 'repayment',
          v_amount,
          '[DEMO-SEED-45D] Cicilan pelunasan kasbon',
          (CURRENT_DATE - v_day) + TIME '16:00:00',
          'manual', v_user
        );
      END IF;
    END IF;
  END LOOP;

  -- 7. Sisipkan SKENARIO BERMAKNA pada Kemarin (Day 1) & Hari Ini (Day 0)
  --    Agar terlihat hidup di Dashboard, Laporan Malam, dan Profil Kredit!

  -- Skenario A: Ahmad setor konsisten & melunasi kasbon (Skor Kredit Tinggi)
  INSERT INTO transactions (
    org_id, fisherman_id, type, species,
    weight_kg, price_per_kg, amount,
    note, occurred_at, source, ai_input_id, created_by
  )
  VALUES
  (
    v_org, v_ahmad, 'catch', 'Tenggiri',
    38, 66000, 2508000,
    '[DEMO-SEED-45D] Setoran tenggiri kualitas ekspor',
    (CURRENT_DATE - 1) + TIME '07:10:00', 'voice', v_ai_confirmed, v_user
  ),
  (
    v_org, v_ahmad, 'repayment', NULL,
    NULL, NULL, 300000,
    '[DEMO-SEED-45D] Pelunasan kasbon rutin',
    (CURRENT_DATE - 1) + TIME '15:20:00', 'manual', NULL, v_user
  );

  -- Skenario B: Harga Tongkol anjlok ke Rp 22.000/kg kemarin (Price Drop -24%)
  INSERT INTO transactions (
    org_id, fisherman_id, type, species,
    weight_kg, price_per_kg, amount,
    note, occurred_at, source, created_by
  )
  VALUES
  (
    v_org, v_made, 'catch', 'Tongkol',
    48, 22000, 1056000,
    '[DEMO-SEED-45D] Harga tongkol turun karena panen raya',
    (CURRENT_DATE - 1) + TIME '08:05:00', 'photo', v_user
  ),
  (
    v_org, v_joko, 'catch', 'Tongkol',
    42, 22500, 945000,
    '[DEMO-SEED-45D] Setoran tongkol siang',
    (CURRENT_DATE - 1) + TIME '11:30:00', 'manual', v_user
  );

  -- Skenario C: Kasbon Budi Hartono melonjak tajam (Advance Spike + Skor Kredit Rendah)
  INSERT INTO transactions (
    org_id, fisherman_id, type,
    amount, note, occurred_at, source, created_by
  )
  VALUES
  (
    v_org, v_budi, 'advance',
    1250000,
    '[DEMO-SEED-45D] Kasbon perbaikan mesin perahu',
    (CURRENT_DATE - 1) + TIME '13:45:00', 'manual', v_user
  ),
  (
    v_org, v_budi, 'advance',
    950000,
    '[DEMO-SEED-45D] Tambahan kasbon darurat keluarga',
    CURRENT_DATE + TIME '09:15:00', 'manual', v_user
  );

  -- Skenario D: Outlier Berat Tangkapan Wayan (135 kg Cakalang)
  INSERT INTO transactions (
    org_id, fisherman_id, type, species,
    weight_kg, price_per_kg, amount,
    note, occurred_at, source, created_by
  )
  VALUES
  (
    v_org, v_wayan, 'catch', 'Cakalang',
    135, 33000, 4455000,
    '[DEMO-SEED-45D] Tangkapan besar rompong selatan',
    (CURRENT_DATE - 1) + TIME '09:40:00', 'voice', v_user
  );

  -- Transaksi tambahan hari ini (Day 0) supaya tombol "Buat laporan sekarang" langsung kaya data
  INSERT INTO transactions (
    org_id, fisherman_id, type, species,
    weight_kg, price_per_kg, amount,
    note, occurred_at, source, created_by
  )
  VALUES
  (
    v_org, v_ahmad, 'catch', 'Tongkol',
    44, 28000, 1232000,
    '[DEMO-SEED-45D] Setoran pagi hari ini',
    CURRENT_DATE + TIME '06:45:00', 'voice', v_user
  ),
  (
    v_org, v_ketut, 'catch', 'Kembung',
    36, 25000, 900000,
    '[DEMO-SEED-45D] Setoran kembung segar',
    CURRENT_DATE + TIME '07:30:00', 'manual', v_user
  ),
  (
    v_org, v_hendra, 'catch', 'Teri',
    25, 41000, 1025000,
    '[DEMO-SEED-45D] Setoran ikan teri',
    CURRENT_DATE + TIME '08:20:00', 'photo', v_user
  );

  -- 8. Pre-generate Laporan Malam (7 hari terakhir s/d Kemarin)
  INSERT INTO daily_reports (org_id, report_date, metrics, narrative, model)
  VALUES
  (
    v_org,
    CURRENT_DATE - 3,
    '{
      "total_kg": 142,
      "total_value": 4680000,
      "advance_issued": 350000,
      "repayment_received": 300000,
      "top_species": "Cakalang",
      "avg_price": { "Cakalang": 33500, "Tongkol": 29500, "Kembung": 25000 }
    }'::jsonb,
    'Operasional berjalan stabil dengan total tangkapan 142 kg yang didominasi ikan Cakalang. Arus kasbon dan pelunasan berimbang dengan baik.',
    'gemini-2.5-flash'
  ),
  (
    v_org,
    CURRENT_DATE - 2,
    '{
      "total_kg": 128,
      "total_value": 4210000,
      "advance_issued": 450000,
      "repayment_received": 250000,
      "top_species": "Tenggiri",
      "avg_price": { "Tenggiri": 65500, "Layang": 22500, "Teri": 40000 }
    }'::jsonb,
    'Volume tangkapan tercatat 128 kg dengan kontribusi nilai tertinggi dari ikan Tenggiri. Harga beli seluruh komoditas terpantau stabil.',
    'gemini-2.5-flash'
  ),
  (
    v_org,
    CURRENT_DATE - 1,
    '{
      "total_kg": 263,
      "total_value": 8964000,
      "advance_issued": 1250000,
      "repayment_received": 300000,
      "top_species": "Cakalang",
      "avg_price": {
        "Cakalang": 33000,
        "Tenggiri": 66000,
        "Tongkol": 22233
      }
    }'::jsonb,
    'Total tangkapan melonjak menjadi 263 kg berkat setoran besar Cakalang dari I Wayan Suardika. Namun, terdeteksi penurunan tajam harga beli Tongkol sebesar 23,3% serta lonjakan kasbon signifikan pada Budi Hartono yang perlu segera dipantau.',
    'gemini-2.5-flash'
  )
  ON CONFLICT (org_id, report_date)
  DO UPDATE SET
    metrics = EXCLUDED.metrics,
    narrative = EXCLUDED.narrative,
    model = EXCLUDED.model;

  -- 9. Pre-generate Anomali Kemarin (untuk tampil langsung di Dashboard & Laporan)
  INSERT INTO anomalies (org_id, report_date, fisherman_id, kind, severity, detail)
  VALUES
  (
    v_org,
    CURRENT_DATE - 1,
    NULL,
    'price_drop',
    2,
    '{
      "species": "Tongkol",
      "previous_price": 29000,
      "current_price": 22233,
      "change_percent": -23.33,
      "window_days": 7,
      "message": "Harga Tongkol turun 23.3% (Rp 22.233/kg vs rata-rata 7 hari Rp 29.000/kg)."
    }'::jsonb
  ),
  (
    v_org,
    CURRENT_DATE - 1,
    v_budi,
    'advance_spike',
    3,
    '{
      "amount": 1250000,
      "fisherman_avg_advance": 450000,
      "multiplier": 2.78,
      "message": "Kasbon Budi Hartono sebesar Rp 1.250.000 melonjak 2.8× di atas rata-rata kasbonnya (Rp 450.000)."
    }'::jsonb
  ),
  (
    v_org,
    CURRENT_DATE - 1,
    v_wayan,
    'weight_outlier',
    1,
    '{
      "species": "Cakalang",
      "weight_kg": 135,
      "average_weight_kg": 34.5,
      "z_score": 2.85,
      "message": "Setoran Cakalang oleh I Wayan Suardika (135 kg) jauh melebihi rata-rata normal (34.5 kg)."
    }'::jsonb
  );

  -- 10. Pre-generate Profil Kredit untuk semua 9 Nelayan (Ahmad Tinggi, Budi Rendah)
  INSERT INTO credit_profiles (org_id, fisherman_id, score, factors, narrative)
  VALUES
  (
    v_org, v_ahmad, 91,
    '{
      "consistency": 95,
      "advance_ratio": 90,
      "repayment_history": 92,
      "active_duration": 88,
      "details": { "active_weeks": 7, "catch_count": 21, "advance_to_catch_pct": 8.4, "repayment_pct": 92.0, "active_days": 45 }
    }'::jsonb,
    'Ahmad Santoso menunjukkan konsistensi setoran sangat tinggi selama 45 hari terakhir dengan rasio kasbon rendah dan kedisiplinan pelunasan yang sangat baik. Sangat layak direkomendasikan untuk akses permodalan mikro.'
  ),
  (
    v_org, v_budi, 46,
    '{
      "consistency": 72,
      "advance_ratio": 22,
      "repayment_history": 25,
      "active_duration": 85,
      "details": { "active_weeks": 6, "catch_count": 14, "advance_to_catch_pct": 76.5, "repayment_pct": 25.0, "active_days": 44 }
    }'::jsonb,
    'Meskipun Budi Hartono aktif menyetor tangkapan, akumulasi kasbon beredar sangat tinggi dibanding total pendapatan dan tingkat pelunasannya rendah. Disarankan pembatasan kasbon baru hingga rasio utang menurun.'
  ),
  (
    v_org, v_joko, 82,
    '{
      "consistency": 84,
      "advance_ratio": 80,
      "repayment_history": 83,
      "active_duration": 82,
      "details": { "active_weeks": 6, "catch_count": 17, "advance_to_catch_pct": 16.2, "repayment_pct": 83.0, "active_days": 43 }
    }'::jsonb,
    'Joko Prasetyo memiliki arus setoran ikan yang stabil dengan pengelolaan kasbon yang terkendali dan pembayaran cicilan yang konsisten.'
  ),
  (
    v_org, v_wayan, 86,
    '{
      "consistency": 88,
      "advance_ratio": 86,
      "repayment_history": 84,
      "active_duration": 85,
      "details": { "active_weeks": 7, "catch_count": 19, "advance_to_catch_pct": 12.1, "repayment_pct": 84.0, "active_days": 45 }
    }'::jsonb,
    'I Wayan Suardika mencatat volume nilai tangkapan yang sangat kuat dan rasio utang sehat, menjadikannya salah satu mitra nelayan dengan profil kredit terbaik.'
  ),
  (
    v_org, v_made, 84,
    '{
      "consistency": 86,
      "advance_ratio": 82,
      "repayment_history": 85,
      "active_duration": 80,
      "details": { "active_weeks": 6, "catch_count": 18, "advance_to_catch_pct": 14.5, "repayment_pct": 85.0, "active_days": 42 }
    }'::jsonb,
    'I Made Arya menunjukkan frekuensi melaut dan penyetoran yang teratur dengan riwayat pelunasan kasbon yang positif.'
  ),
  (
    v_org, v_komang, 76,
    '{
      "consistency": 78,
      "advance_ratio": 72,
      "repayment_history": 76,
      "active_duration": 80,
      "details": { "active_weeks": 6, "catch_count": 15, "advance_to_catch_pct": 24.0, "repayment_pct": 76.0, "active_days": 41 }
    }'::jsonb,
    'I Komang Putra memiliki performa setoran cukup baik, namun masih memiliki sisa kasbon operasional yang perlu dijaga kelancaran cicilannya.'
  ),
  (
    v_org, v_ketut, 80,
    '{
      "consistency": 82,
      "advance_ratio": 79,
      "repayment_history": 80,
      "active_duration": 78,
      "details": { "active_weeks": 6, "catch_count": 16, "advance_to_catch_pct": 18.0, "repayment_pct": 80.0, "active_days": 40 }
    }'::jsonb,
    'I Ketut Wijaya mempertahankan catatan transaksi yang sehat dan seimbang antara nilai tangkapan dan kewajiban kasbon.'
  ),
  (
    v_org, v_nyoman, 73,
    '{
      "consistency": 74,
      "advance_ratio": 70,
      "repayment_history": 74,
      "active_duration": 76,
      "details": { "active_weeks": 5, "catch_count": 13, "advance_to_catch_pct": 26.5, "repayment_pct": 74.0, "active_days": 39 }
    }'::jsonb,
    'I Nyoman Sutrisna memiliki riwayat setoran yang cukup teratur dengan tingkat kasbon moderat dan masih dapat ditingkatkan konsistensinya.'
  ),
  (
    v_org, v_hendra, 79,
    '{
      "consistency": 80,
      "advance_ratio": 78,
      "repayment_history": 80,
      "active_duration": 75,
      "details": { "active_weeks": 6, "catch_count": 15, "advance_to_catch_pct": 19.2, "repayment_pct": 80.0, "active_days": 38 }
    }'::jsonb,
    'Hendra Gunawan menunjukkan tren setoran yang positif dengan rasio pinjaman yang tetap berada dalam batas aman.'
  )
  ON CONFLICT (fisherman_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    factors = EXCLUDED.factors,
    narrative = EXCLUDED.narrative,
    computed_at = now();

  RAISE NOTICE 'Seed 45 hari berhasil dijalankan! Organization ID: %', v_org;
END $$;