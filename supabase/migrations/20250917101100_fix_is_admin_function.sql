CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;