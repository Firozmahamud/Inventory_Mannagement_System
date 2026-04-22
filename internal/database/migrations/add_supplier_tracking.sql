-- Migration: Add created_by and updated_by to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_created_by ON suppliers(created_by);
CREATE INDEX IF NOT EXISTS idx_suppliers_updated_by ON suppliers(updated_by);
