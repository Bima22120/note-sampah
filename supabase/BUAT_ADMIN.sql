-- =============================================
-- JALANKAN DI SUPABASE SQL EDITOR
-- Ini akan memperbaiki profile dan membuat admin
-- =============================================

-- 1. Pastikan profile ada untuk SEMUA user yang terdaftar
INSERT INTO profiles (id, full_name, role)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  'user'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- 2. Jadikan bima33130@gmail.com sebagai ADMIN
UPDATE profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'bima33130@gmail.com'
);
