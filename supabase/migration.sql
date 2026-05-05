-- ============================================
-- NoteSampah - Supabase Database Migration
-- ============================================
-- CARA MENJALANKAN:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih project Anda
-- 3. Klik "SQL Editor" di sidebar kiri
-- 4. Klik "New Query"
-- 5. Copy-paste SELURUH isi file ini
-- 6. Klik "Run" (atau Ctrl+Enter)
-- ============================================

-- ==========================================
-- STEP 0: Bersihkan data lama (jika ada)
-- ==========================================
-- Hapus trigger lama jika ada
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Hapus policies lama jika ada
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert for service role and triggers" ON profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can view own reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can view all reports" ON waste_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can update all reports" ON waste_reports;

-- Hapus tabel lama jika ada (HATI-HATI: ini menghapus semua data!)
DROP TABLE IF EXISTS waste_reports;
DROP TABLE IF EXISTS profiles;

-- Hapus semua user auth yang sudah terdaftar sebelumnya (karena profilenya gagal dibuat)
DELETE FROM auth.users;

-- ==========================================
-- STEP 1: Buat Tabel
-- ==========================================

-- Tabel Profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Waste Reports
CREATE TABLE waste_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('organik', 'anorganik')),
  weight_grams INTEGER NOT NULL CHECK (weight_grams > 0),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- STEP 2: Enable Row Level Security
-- ==========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 3: Policies untuk Profiles
-- ==========================================

-- User bisa melihat profile sendiri
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- User bisa update profile sendiri
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin bisa melihat semua profile
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User yang sudah login bisa insert profile sendiri (untuk registrasi)
CREATE POLICY "Allow insert for authenticated users"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- STEP 4: Policies untuk Waste Reports
-- ==========================================

-- User bisa lihat laporan sendiri
CREATE POLICY "Users can view own reports"
  ON waste_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Admin bisa lihat semua laporan
CREATE POLICY "Admin can view all reports"
  ON waste_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User bisa buat laporan sendiri
CREATE POLICY "Users can insert own reports"
  ON waste_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin bisa update semua laporan
CREATE POLICY "Admin can update all reports"
  ON waste_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- STEP 5: Index untuk performa
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_waste_reports_user_id ON waste_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_waste_reports_status ON waste_reports(status);
CREATE INDEX IF NOT EXISTS idx_waste_reports_category ON waste_reports(category);
CREATE INDEX IF NOT EXISTS idx_waste_reports_created_at ON waste_reports(created_at DESC);

-- ============================================
-- SELESAI!
-- 
-- Profile akan dibuat otomatis dari aplikasi
-- saat user mendaftar (tidak pakai trigger).
--
-- Untuk membuat user admin pertama:
-- 1. Register melalui aplikasi seperti biasa
-- 2. Jalankan query berikut di SQL Editor (ganti email):
--
--    UPDATE profiles 
--    SET role = 'admin' 
--    WHERE id = (
--      SELECT id FROM auth.users 
--      WHERE email = 'admin@email.com'
--    );
--
-- ============================================
