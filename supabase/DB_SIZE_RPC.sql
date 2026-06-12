-- Fungsi untuk mengambil ukuran database secara realtime
-- (Limit default Supabase Free Tier adalah 500MB)

CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'db_limit_bytes', 524288000
  );
$$;
