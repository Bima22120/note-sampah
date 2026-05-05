-- ============================================
-- NoteSampah - Cleanup Script
-- ============================================
-- Jalankan ini di SQL Editor SEBELUM migration.sql
-- jika Anda pernah mencoba mendaftar dan gagal.
-- Script ini akan menghapus user yang "terjebak" di auth.users
-- tapi tidak punya profile.
-- ============================================

-- Hapus user dari auth.users yang tidak punya profile (user gagal)
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles WHERE profiles.id IS NOT NULL);

-- Jika tabel profiles belum ada, hapus semua user
-- (uncomment baris di bawah jika perlu)
-- DELETE FROM auth.users;
