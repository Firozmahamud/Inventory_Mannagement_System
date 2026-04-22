-- =============================================
-- INVENTORY MANAGEMENT SYSTEM - PostgreSQL Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- AUTH & USER MANAGEMENT
-- =============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Sessions table (for JWT refresh tokens)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Login history
CREATE TABLE login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    location VARCHAR(255),
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT login_history_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- RBAC (Role Based Access Control)
-- =============================================

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT roles_name_unique UNIQUE (name)
);

-- User roles (multi-role per user)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id),
    CONSTRAINT user_roles_assigned_by_fk FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT permissions_name_unique UNIQUE (name)
);

-- Role permissions
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

-- =============================================
-- INVENTORY CORE
-- =============================================

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    image VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categories_parent_fk FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    contact_person VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT suppliers_code_unique UNIQUE (code)
);

-- Warehouses
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT warehouses_code_unique UNIQUE (code)
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    unit VARCHAR(50) DEFAULT 'PCS',
    barcode VARCHAR(100),
    image VARCHAR(500),
    cost_price DECIMAL(15, 2) DEFAULT 0,
    sell_price DECIMAL(15, 2) DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_sku_unique UNIQUE (sku),
    CONSTRAINT products_category_fk FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT products_price_check CHECK (cost_price >= 0 AND sell_price >= 0)
);

-- Product suppliers (many-to-many)
CREATE TABLE product_suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(100),
    cost_price DECIMAL(15, 2),
    lead_time_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_suppliers_unique UNIQUE (product_id, supplier_id),
    CONSTRAINT product_suppliers_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT product_suppliers_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- =============================================
-- WAREHOUSE STORAGE LOCATIONS (WMS)
-- =============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    zone VARCHAR(10) NOT NULL,
    aisle VARCHAR(10) NOT NULL,
    rack VARCHAR(10) NOT NULL,
    shelf VARCHAR(10) NOT NULL,
    bin VARCHAR(10) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    max_capacity INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_code ON locations(code);

-- Inventory (per warehouse and location)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    last_stock_in TIMESTAMP WITH TIME ZONE,
    last_stock_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inventory_unique UNIQUE (product_id, warehouse_id, location_id),
    CONSTRAINT inventory_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT inventory_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT inventory_location_fk FOREIGN KEY (location_id) REFERENCES locations(id),
    CONSTRAINT inventory_quantity_check CHECK (quantity >= 0 AND reserved_quantity >= 0)
);

CREATE INDEX idx_inventory_location ON inventory(location_id);

-- =============================================
-- STOCK MANAGEMENT
-- =============================================

-- Stock transaction types
CREATE TYPE transaction_type AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT');

-- Stock transaction status
CREATE TYPE transaction_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- Stock transactions
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_no VARCHAR(50) UNIQUE NOT NULL,
    transaction_type transaction_type NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    from_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    from_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    to_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(15, 2),
    total_cost DECIMAL(15, 2),
    reference_no VARCHAR(100),
    reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    status transaction_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stock_transactions_transaction_no_unique UNIQUE (transaction_no),
    CONSTRAINT stock_transactions_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT stock_transactions_from_warehouse_fk FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT stock_transactions_to_warehouse_fk FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT stock_transactions_from_location_fk FOREIGN KEY (from_location_id) REFERENCES locations(id),
    CONSTRAINT stock_transactions_to_location_fk FOREIGN KEY (to_location_id) REFERENCES locations(id),
    CONSTRAINT stock_transactions_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT stock_transactions_approved_by_fk FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT stock_transactions_quantity_check CHECK (quantity > 0)
);

-- =============================================
-- PURCHASE ORDERS
-- =============================================

-- Purchase order status
CREATE TYPE purchase_order_status AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- Purchase order priority
CREATE TYPE purchase_order_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Purchase orders
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    expected_date DATE,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    status purchase_order_status DEFAULT 'DRAFT',
    priority purchase_order_priority DEFAULT 'NORMAL',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_orders_order_no_unique UNIQUE (order_no),
    CONSTRAINT purchase_orders_supplier_fk FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT purchase_orders_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT purchase_orders_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT purchase_orders_approved_by_fk FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT purchase_orders_amount_check CHECK (total_amount >= 0 AND tax_amount >= 0 AND discount_amount >= 0)
);

-- Purchase order items
CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_order_items_order_fk FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    CONSTRAINT purchase_order_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT purchase_order_items_quantity_check CHECK (quantity > 0 AND received_quantity >= 0)
);

-- =============================================
-- SALES ORDERS
-- =============================================

-- Sales order status
CREATE TYPE sales_order_status AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- Sales order priority
CREATE TYPE sales_order_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- Sales orders
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_address TEXT,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
    order_date DATE,
    delivery_date DATE,
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status sales_order_status DEFAULT 'DRAFT',
    priority sales_order_priority DEFAULT 'NORMAL',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_orders_order_no_unique UNIQUE (order_no),
    CONSTRAINT sales_orders_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    CONSTRAINT sales_orders_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT sales_orders_confirmed_by_fk FOREIGN KEY (confirmed_by) REFERENCES users(id),
    CONSTRAINT sales_orders_amount_check CHECK (subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND total_amount >= 0)
);

-- Sales order items
CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sales_order_items_order_fk FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    CONSTRAINT sales_order_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT sales_order_items_quantity_check CHECK (quantity > 0)
);

-- =============================================
-- AUDIT LOG
-- =============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

-- Notification type
CREATE TYPE notification_type AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- INDEXES
-- =============================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Session indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);

-- Login history indexes
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_created_at ON login_history(created_at);

-- RBAC indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Category indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Supplier indexes
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_city ON suppliers(city);

-- Warehouse indexes
CREATE INDEX idx_warehouses_code ON warehouses(code);
CREATE INDEX idx_warehouses_is_active ON warehouses(is_active);
CREATE INDEX idx_warehouses_is_primary ON warehouses(is_primary);

-- Product indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Product suppliers indexes
CREATE INDEX idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);

-- Inventory indexes
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);

-- Stock transaction indexes
CREATE INDEX idx_stock_transactions_transaction_no ON stock_transactions(transaction_no);
CREATE INDEX idx_stock_transactions_product_id ON stock_transactions(product_id);
CREATE INDEX idx_stock_transactions_type ON stock_transactions(transaction_type);
CREATE INDEX idx_stock_transactions_status ON stock_transactions(status);
CREATE INDEX idx_stock_transactions_created_by ON stock_transactions(created_by);
CREATE INDEX idx_stock_transactions_created_at ON stock_transactions(created_at);

-- Purchase order indexes
CREATE INDEX idx_purchase_orders_order_no ON purchase_orders(order_no);
CREATE INDEX idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_warehouse_id ON purchase_orders(warehouse_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_by ON purchase_orders(created_by);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders(created_at);

-- Purchase order items indexes
CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);

-- Sales order indexes
CREATE INDEX idx_sales_orders_order_no ON sales_orders(order_no);
CREATE INDEX idx_sales_orders_customer_name ON sales_orders(customer_name);
CREATE INDEX idx_sales_orders_customer_email ON sales_orders(customer_email);
CREATE INDEX idx_sales_orders_warehouse_id ON sales_orders(warehouse_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_created_by ON sales_orders(created_by);
CREATE INDEX idx_sales_orders_created_at ON sales_orders(created_at);

-- Sales order items indexes
CREATE INDEX idx_sales_order_items_order_id ON sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product_id ON sales_order_items(product_id);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to generate unique transaction number
CREATE OR REPLACE FUNCTION generate_transaction_no(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
    new_no TEXT;
    seq_num BIGINT;
BEGIN
    seq_num := nextval(format('%s_seq', prefix));
    new_no := format('%s-%s-%s', prefix, to_char(CURRENT_DATE, 'YYYYMMDD'), lpad(seq_num::TEXT, 6, '0'));
    RETURN new_no;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name
    FROM permissions p
    INNER JOIN role_permissions rp ON p.id = rp.permission_id
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_transactions_updated_at
    BEFORE UPDATE ON stock_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_order_items_updated_at
    BEFORE UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEQUENCES
-- =============================================

CREATE SEQUENCE IF NOT EXISTS stock_in_seq;
CREATE SEQUENCE IF NOT EXISTS stock_out_seq;
CREATE SEQUENCE IF NOT EXISTS stock_transfer_seq;
CREATE SEQUENCE IF NOT EXISTS stock_adjustment_seq;
CREATE SEQUENCE IF NOT EXISTS po_seq;
CREATE SEQUENCE IF NOT EXISTS so_seq;

-- =============================================
-- DEFAULT DATA
-- =============================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
    ('ADMIN', 'Full system access with all privileges'),
    ('MANAGER', 'Manage inventory, orders, and reports'),
    ('STAFF', 'Basic inventory operations and order management'),
    ('VIEWER', 'Read-only access to view data')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description) VALUES 
    ('view_dashboard', 'View dashboard and analytics'),
    ('manage_products', 'Create, update, delete products'),
    ('view_products', 'View products only'),
    ('manage_inventory', 'Manage inventory and stock'),
    ('view_inventory', 'View inventory only'),
    ('manage_orders', 'Manage purchase and sales orders'),
    ('view_orders', 'View orders only'),
    ('manage_suppliers', 'Manage suppliers'),
    ('view_suppliers', 'View suppliers only'),
    ('manage_warehouses', 'Manage warehouses'),
    ('view_warehouses', 'View warehouses only'),
    ('manage_users', 'Manage system users'),
    ('view_users', 'View users only'),
    ('manage_roles', 'Manage roles and permissions'),
    ('view_reports', 'View reports and analytics'),
    ('export_data', 'Export data to PDF/Excel'),
    ('approve_orders', 'Approve pending orders'),
    ('manage_notifications', 'Manage notifications')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to ADMIN role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Assign basic permissions to MANAGER role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'MANAGER' AND p.name IN (
    'view_dashboard', 'manage_products', 'view_products', 'manage_inventory',
    'view_inventory', 'manage_orders', 'view_orders', 'view_suppliers',
    'view_warehouses', 'view_users', 'view_reports', 'export_data', 'approve_orders'
)
ON CONFLICT DO NOTHING;

-- Assign basic permissions to STAFF role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'STAFF' AND p.name IN (
    'view_dashboard', 'view_products', 'view_inventory', 
    'manage_orders', 'view_orders', 'view_suppliers', 'view_warehouses'
)
ON CONFLICT DO NOTHING;

-- Assign read-only permissions to VIEWER role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'VIEWER'
ON CONFLICT DO NOTHING;

-- Insert default admin user (password: Admin@123 - bcrypt hash)
INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active)
VALUES ('admin@inventory.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System', 'Admin', '+1234567890', true)
ON CONFLICT (email) DO NOTHING;

-- Insert default warehouses
INSERT INTO warehouses (name, code, address, city, country, is_primary, is_active) VALUES
    ('Main Warehouse', 'WH001', '123 Main Street', 'New York', 'USA', true, true),
    ('Secondary Warehouse', 'WH002', '456 Secondary Ave', 'Los Angeles', 'USA', false, true),
    ('Regional Warehouse', 'WH003', '789 Regional Blvd', 'Chicago', 'USA', false, true)
ON CONFLICT (code) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, description, is_active) VALUES
    ('Electronics', 'Electronic devices and accessories', true),
    ('Clothing', 'Apparel and fashion items', true),
    ('Office Supplies', 'Office and stationery items', true),
    ('Home & Garden', 'Home improvement and garden items', true),
    ('Sports', 'Sports equipment and accessories', true)
ON CONFLICT (name) DO NOTHING;