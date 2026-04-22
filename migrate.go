package main

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	dsn := "host=localhost user=postgres password=1234 dbname=inventory port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	fmt.Println("Connected to database")

	// Products table
	fmt.Println("Adding columns to products...")
	db.Exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS created_by UUID")
	db.Exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_by UUID")
	fmt.Println("Products table updated")

	// Categories table
	fmt.Println("Adding columns to categories...")
	db.Exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_by UUID")
	db.Exec("ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_by UUID")
	fmt.Println("Categories table updated")

	// Suppliers table
	fmt.Println("Adding columns to suppliers...")
	db.Exec("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS created_by UUID")
	db.Exec("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by UUID")
	fmt.Println("Suppliers table updated")

	// Warehouses table
	fmt.Println("Adding columns to warehouses...")
	db.Exec("ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS created_by UUID")
	db.Exec("ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS updated_by UUID")
	fmt.Println("Warehouses table updated")

	// Users table
	fmt.Println("Adding columns to users...")
	db.Exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by UUID")
	fmt.Println("Users table updated")

	// Roles table
	fmt.Println("Adding columns to roles...")
	db.Exec("ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID")
	fmt.Println("Roles table updated")

	fmt.Println("Migration completed successfully!")
}
