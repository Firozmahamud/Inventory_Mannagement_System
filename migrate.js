const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '1234',
  database: 'inventory'
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Products table
    console.log('Adding columns to products...');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_by UUID');
    console.log('Products table updated');

    // Categories table
    console.log('Adding columns to categories...');
    await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by UUID');
    await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_by UUID');
    console.log('Categories table updated');

    // Suppliers table
    console.log('Adding columns to suppliers...');
    await client.query('ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by UUID');
    await client.query('ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by UUID');
    console.log('Suppliers table updated');

    // Warehouses table
    console.log('Adding columns to warehouses...');
    await client.query('ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS created_by UUID');
    await client.query('ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS updated_by UUID');
    console.log('Warehouses table updated');

    // Users table
    console.log('Adding columns to users...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID');
    console.log('Users table updated');

    // Roles table
    console.log('Adding columns to roles...');
    await client.query('ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID');
    console.log('Roles table updated');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

migrate();
