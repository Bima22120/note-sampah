-- 1. Hapus data olahan yang tanggal masuknya tidak ada di daftar laporan (yang disetujui)
DELETE FROM processed_waste
WHERE date NOT IN (
    SELECT DISTINCT CAST(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' AS DATE)
    FROM waste_reports
    WHERE status = 'approved'
);

-- 2. Tambahkan kolom tanggal olahan (kapan admin mengeksekusinya)
ALTER TABLE processed_waste ADD COLUMN processing_date DATE;

-- 3. Set default data lama: anggap saja tanggal olahannya sama dengan tanggal masuk
UPDATE processed_waste SET processing_date = date;

-- 4. Set processing_date menjadi wajib diisi
ALTER TABLE processed_waste ALTER COLUMN processing_date SET NOT NULL;
