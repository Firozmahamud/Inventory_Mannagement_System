-- Migration: Add created_by and updated_by columns to track user actions
-- Run this SQL on your PostgreSQL database

-- Products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE products ADD CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE products ADD CONSTRAINT fk_products_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE categories ADD CONSTRAINT fk_categories_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE categories ADD CONSTRAINT fk_categories_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE suppliers ADD CONSTRAINT fk_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Warehouses table
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE warehouses ADD CONSTRAINT fk_warehouses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- Users table (for tracking who created user accounts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
