-- ============================================
-- Update Schema untuk Public User (Tanpa Login)
-- ============================================

-- 1. Tambahkan kolom nama_pelapor, rt, dan rw ke waste_reports
ALTER TABLE waste_reports ADD COLUMN IF NOT EXISTS nama_pelapor TEXT;
ALTER TABLE waste_reports ADD COLUMN IF NOT EXISTS rt TEXT;
ALTER TABLE waste_reports ADD COLUMN IF NOT EXISTS rw TEXT;

-- 2. Buat user_id menjadi opsional (karena public user tidak punya user_id)
ALTER TABLE waste_reports ALTER COLUMN user_id DROP NOT NULL;

-- 3. Hapus policy lama untuk waste_reports
DROP POLICY IF EXISTS "Users can view own reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can view all reports" ON waste_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can update all reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can delete reports" ON waste_reports;
DROP POLICY IF EXISTS "Public can view all reports" ON waste_reports;
DROP POLICY IF EXISTS "Public can insert reports" ON waste_reports;

-- 4. Buat policy baru yang mengizinkan anon (public) untuk melihat dan membuat laporan
-- Public bisa melihat semua laporan
CREATE POLICY "Public can view all reports" 
  ON waste_reports FOR SELECT 
  USING (true);

-- Public bisa membuat laporan
CREATE POLICY "Public can insert reports" 
  ON waste_reports FOR INSERT 
  WITH CHECK (true);

-- Admin bisa update semua laporan (menggunakan exist role admin)
CREATE POLICY "Admin can update all reports" 
  ON waste_reports FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin bisa hapus laporan (opsional, jika diperlukan)
CREATE POLICY "Admin can delete reports" 
  ON waste_reports FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
