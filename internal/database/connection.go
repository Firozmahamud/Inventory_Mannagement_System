package database

import (
	"fmt"
	"log"

	"inventory-system/config"
	"inventory-system/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect() (*gorm.DB, error) {
	cfg := config.Load()

	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	log.Println("Database connected successfully")
	return db, nil
}

func Migrate(db *gorm.DB) error {
	log.Println("Running database migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.Session{},
		&models.LoginHistory{},
		&models.Role{},
		&models.UserRole{},
		&models.Permission{},
		&models.RolePermission{},
		&models.Category{},
		&models.Supplier{},
		&models.Warehouse{},
		&models.Product{},
		&models.ProductSupplier{},
		&models.Inventory{},
		&models.StockTransaction{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.SalesOrder{},
		&models.SalesOrderItem{},
		&models.AuditLog{},
		&models.Notification{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	log.Println("Database migrations completed")
	return nil
}
