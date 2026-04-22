-- Seed script to populate roles, permissions, and role_permissions
-- Run this against your inventory database

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
WHERE r.name = 'VIEWER' AND p.name IN (
    'view_dashboard', 'view_products', 'view_inventory',
    'view_orders', 'view_suppliers', 'view_warehouses',
    'view_users', 'view_reports'
)
ON CONFLICT DO NOTHING;

-- Assign ADMIN role to admin user (if user exists)
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'admin@inventory.com' AND r.name = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Verify the data
SELECT 'Roles' as table_name, COUNT(*) as count FROM roles
UNION ALL
SELECT 'Permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'Role Permissions', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'User Roles', COUNT(*) FROM user_roles;
