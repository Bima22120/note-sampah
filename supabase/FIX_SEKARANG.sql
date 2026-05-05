-- =============================================
-- COPY-PASTE SELURUH ISI FILE INI KE SQL EDITOR
-- LALU KLIK "RUN"
-- =============================================

-- Hapus trigger yang menyebabkan error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Hapus semua user yang gagal mendaftar
DELETE FROM auth.users;

-- Hapus tabel lama
DROP TABLE IF EXISTS waste_reports;
DROP TABLE IF EXISTS profiles;

-- Buat tabel profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buat tabel waste_reports
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

-- Aktifkan keamanan
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;

-- Policy: profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow insert for authenticated users" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy: waste_reports
CREATE POLICY "Users can view own reports" ON waste_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all reports" ON waste_reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own reports" ON waste_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update all reports" ON waste_reports FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Index
CREATE INDEX idx_waste_reports_user_id ON waste_reports(user_id);
CREATE INDEX idx_waste_reports_status ON waste_reports(status);
CREATE INDEX idx_waste_reports_category ON waste_reports(category);
