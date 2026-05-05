-- =============================================
-- JALANKAN DI SUPABASE SQL EDITOR
-- Script ini akan:
-- 1. Memperbaiki masalah infinite recursion (loading terus-menerus)
-- 2. Mengatur akun Anda menjadi Admin
-- 3. Memperbaiki izin Admin untuk menghapus laporan
-- =============================================

-- 1. Buat fungsi helper (SECURITY DEFINER) untuk mengecek status admin dengan aman
-- Ini mencegah infinite recursion (loading muter-muter) karena fungsi ini bypass RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Hapus policy lama yang menyebabkan infinite recursion
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can view all reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can update all reports" ON waste_reports;
DROP POLICY IF EXISTS "Admin can delete reports" ON waste_reports;

-- 3. Buat policy baru menggunakan fungsi is_admin() yang aman
-- Policy Admin untuk profiles
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING ( public.is_admin() );

-- Policy Admin untuk waste_reports
CREATE POLICY "Admin can view all reports"
  ON waste_reports FOR SELECT
  USING ( public.is_admin() );

CREATE POLICY "Admin can update all reports"
  ON waste_reports FOR UPDATE
  USING ( public.is_admin() );

CREATE POLICY "Admin can delete reports"
  ON waste_reports FOR DELETE
  USING ( public.is_admin() );

-- =============================================
-- 4. JADIKAN AKUN ANDA SEBAGAI ADMIN
-- Ganti 'bima33130@gmail.com' dengan email Anda jika berbeda!
-- =============================================

-- Pastikan profile untuk email tersebut ada, jika belum buat otomatis
INSERT INTO profiles (id, full_name, role)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', 'Admin Bima'),
  'admin'
FROM auth.users u
WHERE u.email = 'bima33130@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- Pastikan role-nya diupdate menjadi admin jika profile sudah ada
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'bima33130@gmail.com'
);
