-- =============================================
-- TAMBAH TABEL: processed_waste
-- Untuk mencatat total sampah yang berhasil diolah per hari
-- =============================================
-- CARA MENJALANKAN:
-- 1. Buka Supabase Dashboard > SQL Editor
-- 2. Klik "New Query"
-- 3. Copy-paste SELURUH isi file ini
-- 4. Klik "Run"
-- =============================================

-- Buat tabel processed_waste
CREATE TABLE IF NOT EXISTS processed_waste (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  processed_weight_grams INTEGER NOT NULL CHECK (processed_weight_grams > 0),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan RLS
ALTER TABLE processed_waste ENABLE ROW LEVEL SECURITY;

-- Policy: Semua orang bisa melihat data olahan (public read)
CREATE POLICY "Public can view processed waste"
  ON processed_waste FOR SELECT
  USING (true);

-- Policy: Hanya admin yang bisa insert
CREATE POLICY "Admin can insert processed waste"
  ON processed_waste FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Hanya admin yang bisa update
CREATE POLICY "Admin can update processed waste"
  ON processed_waste FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Hanya admin yang bisa delete
CREATE POLICY "Admin can delete processed waste"
  ON processed_waste FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index untuk performa query berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_processed_waste_date ON processed_waste(date DESC);

-- =============================================
-- SELESAI!
-- Tabel processed_waste siap digunakan.
-- =============================================
