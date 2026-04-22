package database

import (
	"log"

	"inventory-system/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) error {
	log.Println("===========================================")
	log.Println("Starting database seeding...")
	log.Println("===========================================")

	if err := seedRoles(db); err != nil {
		return err
	}

	if err := seedPermissions(db); err != nil {
		return err
	}

	if err := seedRolePermissions(db); err != nil {
		return err
	}

	if err := seedAdminUser(db); err != nil {
		return err
	}

	if err := seedWarehouses(db); err != nil {
		return err
	}

	if err := seedCategories(db); err != nil {
		return err
	}

	if err := seedSuppliers(db); err != nil {
		return err
	}

	if err := seedProducts(db); err != nil {
		return err
	}

	if err := seedLocations(db); err != nil {
		return err
	}

	log.Println("===========================================")
	log.Println("Database seeding completed successfully!")
	log.Println("===========================================")
	return nil
}

func seedRoles(db *gorm.DB) error {
	log.Println("Seeding roles...")
	roles := []models.Role{
		{Name: "ADMIN", Description: "Full system access with all privileges"},
		{Name: "MANAGER", Description: "Manage inventory, orders, and reports"},
		{Name: "STAFF", Description: "Basic inventory operations and order management"},
		{Name: "VIEWER", Description: "Read-only access to view data"},
	}

	for _, role := range roles {
		var existing models.Role
		result := db.Where("name = ?", role.Name).First(&existing)
		if result.RowsAffected == 0 {
			if err := db.Create(&role).Error; err != nil {
				return err
			}
			log.Printf("  [CREATED] Role: %s", role.Name)
		} else {
			log.Printf("  [EXISTS] Role: %s", role.Name)
		}
	}
	return nil
}

func seedPermissions(db *gorm.DB) error {
	log.Println("Seeding permissions...")

	permissions := []struct {
		Name        string
		Description string
	}{
		// Dashboard
		{"view_dashboard", "View dashboard and analytics"},

		// Products - granular
		{"view_products", "View products"},
		{"create_products", "Create new products"},
		{"update_products", "Update existing products"},
		{"delete_products", "Delete products"},

		// Inventory - granular
		{"view_inventory", "View inventory"},
		{"create_inventory", "Create inventory records"},
		{"update_inventory", "Update inventory records"},
		{"delete_inventory", "Delete inventory records"},

		// Orders - granular
		{"view_orders", "View orders"},
		{"create_orders", "Create new orders"},
		{"update_orders", "Update orders"},
		{"delete_orders", "Delete orders"},
		{"approve_orders", "Approve pending orders"},

		// Suppliers - granular
		{"view_suppliers", "View suppliers"},
		{"create_suppliers", "Create new suppliers"},
		{"update_suppliers", "Update suppliers"},
		{"delete_suppliers", "Delete suppliers"},

		// Warehouses - granular
		{"view_warehouses", "View warehouses"},
		{"create_warehouses", "Create new warehouses"},
		{"update_warehouses", "Update warehouses"},
		{"delete_warehouses", "Delete warehouses"},

		// Users - granular
		{"view_users", "View users"},
		{"create_users", "Create new users"},
		{"update_users", "Update users"},
		{"delete_users", "Delete users"},

		// Roles - granular
		{"view_roles", "View roles"},
		{"create_roles", "Create new roles"},
		{"update_roles", "Update roles"},
		{"delete_roles", "Delete roles"},
		{"manage_permissions", "Manage role permissions"},

		// Reports & Data
		{"view_reports", "View reports and analytics"},
		{"export_data", "Export data to PDF/Excel"},

		// Notifications
		{"manage_notifications", "Manage notifications"},
	}

	for _, p := range permissions {
		var existing models.Permission
		result := db.Where("name = ?", p.Name).First(&existing)
		if result.RowsAffected == 0 {
			perm := models.Permission{Name: p.Name, Description: p.Description}
			if err := db.Create(&perm).Error; err != nil {
				return err
			}
			log.Printf("  [CREATED] Permission: %s", p.Name)
		} else {
			log.Printf("  [EXISTS] Permission: %s", p.Name)
		}
	}
	return nil
}

func seedRolePermissions(db *gorm.DB) error {
	log.Println("Seeding role permissions...")

	var adminRole, managerRole, staffRole, viewerRole models.Role
	if err := db.Where("name = ?", "ADMIN").First(&adminRole).Error; err != nil {
		return err
	}
	if err := db.Where("name = ?", "MANAGER").First(&managerRole).Error; err != nil {
		return err
	}
	if err := db.Where("name = ?", "STAFF").First(&staffRole).Error; err != nil {
		return err
	}
	if err := db.Where("name = ?", "VIEWER").First(&viewerRole).Error; err != nil {
		return err
	}

	var allPermissions []models.Permission
	if err := db.Find(&allPermissions).Error; err != nil {
		return err
	}

	// ADMIN gets all permissions
	adminPerms := []string{
		"view_dashboard",
		"view_products", "create_products", "update_products", "delete_products",
		"view_inventory", "create_inventory", "update_inventory", "delete_inventory",
		"view_orders", "create_orders", "update_orders", "delete_orders", "approve_orders",
		"view_suppliers", "create_suppliers", "update_suppliers", "delete_suppliers",
		"view_warehouses", "create_warehouses", "update_warehouses", "delete_warehouses",
		"view_users", "create_users", "update_users", "delete_users",
		"view_roles", "create_roles", "update_roles", "delete_roles",
		"manage_permissions",
		"view_reports", "export_data",
		"manage_notifications",
	}

	// MANAGER gets view, create, update but not delete
	managerPerms := []string{
		"view_dashboard",
		"view_products", "create_products", "update_products",
		"view_inventory", "create_inventory", "update_inventory",
		"view_orders", "create_orders", "update_orders", "approve_orders",
		"view_suppliers", "create_suppliers", "update_suppliers",
		"view_warehouses", "create_warehouses", "update_warehouses",
		"view_users", "update_users",
		"view_roles",
		"view_reports", "export_data",
	}

	// STAFF gets view, create, update orders
	staffPerms := []string{
		"view_dashboard",
		"view_products", "create_products", "update_products",
		"view_inventory", "create_inventory", "update_inventory",
		"view_orders", "create_orders", "update_orders",
		"view_suppliers",
		"view_warehouses",
	}

	// VIEWER gets read-only access
	viewerPerms := []string{
		"view_dashboard",
		"view_products",
		"view_inventory",
		"view_orders",
		"view_suppliers",
		"view_warehouses",
		"view_users",
		"view_roles",
		"view_reports",
	}

	adminCount := 0
	managerCount := 0
	staffCount := 0
	viewerCount := 0

	for _, perm := range allPermissions {
		var existing models.RolePermission

		// ADMIN
		if contains(adminPerms, perm.Name) {
			result := db.Where("role_id = ? AND permission_id = ?", adminRole.ID, perm.ID).First(&existing)
			if result.RowsAffected == 0 {
				rp := models.RolePermission{RoleID: adminRole.ID, PermissionID: perm.ID}
				if err := db.Create(&rp).Error; err != nil {
					return err
				}
				adminCount++
			}
		}

		// MANAGER
		if contains(managerPerms, perm.Name) {
			result := db.Where("role_id = ? AND permission_id = ?", managerRole.ID, perm.ID).First(&existing)
			if result.RowsAffected == 0 {
				rp := models.RolePermission{RoleID: managerRole.ID, PermissionID: perm.ID}
				if err := db.Create(&rp).Error; err != nil {
					return err
				}
				managerCount++
			}
		}

		// STAFF
		if contains(staffPerms, perm.Name) {
			result := db.Where("role_id = ? AND permission_id = ?", staffRole.ID, perm.ID).First(&existing)
			if result.RowsAffected == 0 {
				rp := models.RolePermission{RoleID: staffRole.ID, PermissionID: perm.ID}
				if err := db.Create(&rp).Error; err != nil {
					return err
				}
				staffCount++
			}
		}

		// VIEWER
		if contains(viewerPerms, perm.Name) {
			result := db.Where("role_id = ? AND permission_id = ?", viewerRole.ID, perm.ID).First(&existing)
			if result.RowsAffected == 0 {
				rp := models.RolePermission{RoleID: viewerRole.ID, PermissionID: perm.ID}
				if err := db.Create(&rp).Error; err != nil {
					return err
				}
				viewerCount++
			}
		}
	}

	log.Printf("  ADMIN role: %d permissions assigned", adminCount)
	log.Printf("  MANAGER role: %d permissions assigned", managerCount)
	log.Printf("  STAFF role: %d permissions assigned", staffCount)
	log.Printf("  VIEWER role: %d permissions assigned", viewerCount)

	return nil
}

func seedAdminUser(db *gorm.DB) error {
	log.Println("Seeding admin user...")

	var existingUser models.User
	result := db.Where("email = ?", "admin@inventory.com").First(&existingUser)

	var admin models.User

	if result.RowsAffected == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Admin@123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		admin = models.User{
			Email:        "admin@inventory.com",
			PasswordHash: string(hashedPassword),
			FirstName:    "System",
			LastName:     "Admin",
			Phone:        "+1234567890",
			IsActive:     true,
		}

		if err := db.Create(&admin).Error; err != nil {
			return err
		}
		log.Printf("  [CREATED] Admin user: %s", admin.Email)
	} else {
		admin = existingUser
		log.Printf("  [EXISTS] Admin user: %s", admin.Email)
	}

	var adminRole models.Role
	if err := db.Where("name = ?", "ADMIN").First(&adminRole).Error; err != nil {
		return err
	}

	var existingUserRole models.UserRole
	roleResult := db.Where("user_id = ? AND role_id = ?", admin.ID, adminRole.ID).First(&existingUserRole)
	if roleResult.RowsAffected == 0 {
		userRole := models.UserRole{
			UserID: admin.ID,
			RoleID: adminRole.ID,
		}
		if err := db.Create(&userRole).Error; err != nil {
			return err
		}
		log.Printf("  [ASSIGNED] ADMIN role to user: %s", admin.Email)
	} else {
		log.Printf("  [EXISTS] ADMIN role already assigned to: %s", admin.Email)
	}

	return nil
}

func seedWarehouses(db *gorm.DB) error {
	log.Println("Seeding warehouses...")
	warehouses := []models.Warehouse{
		{Name: "Main Warehouse", Code: "WH001", Address: "123 Main Street", City: "New York", Country: "USA", IsPrimary: true, IsActive: true},
		{Name: "Secondary Warehouse", Code: "WH002", Address: "456 Secondary Ave", City: "Los Angeles", Country: "USA", IsPrimary: false, IsActive: true},
		{Name: "Regional Warehouse", Code: "WH003", Address: "789 Regional Blvd", City: "Chicago", Country: "USA", IsPrimary: false, IsActive: true},
	}

	for _, wh := range warehouses {
		var existing models.Warehouse
		result := db.Where("code = ?", wh.Code).First(&existing)
		if result.RowsAffected == 0 {
			if err := db.Create(&wh).Error; err != nil {
				return err
			}
			log.Printf("  [CREATED] Warehouse: %s", wh.Code)
		} else {
			log.Printf("  [EXISTS] Warehouse: %s", wh.Code)
		}
	}
	return nil
}

func seedCategories(db *gorm.DB) error {
	log.Println("Seeding categories...")
	categories := []models.Category{
		{Name: "Electronics", Description: "Electronic devices and accessories", IsActive: true},
		{Name: "Clothing", Description: "Apparel and fashion items", IsActive: true},
		{Name: "Office Supplies", Description: "Office and stationery items", IsActive: true},
		{Name: "Home & Garden", Description: "Home improvement and garden items", IsActive: true},
		{Name: "Sports", Description: "Sports equipment and accessories", IsActive: true},
	}

	for _, cat := range categories {
		var existing models.Category
		result := db.Where("name = ?", cat.Name).First(&existing)
		if result.RowsAffected == 0 {
			if err := db.Create(&cat).Error; err != nil {
				return err
			}
			log.Printf("  [CREATED] Category: %s", cat.Name)
		} else {
			log.Printf("  [EXISTS] Category: %s", cat.Name)
		}
	}
	return nil
}

func seedSuppliers(db *gorm.DB) error {
	log.Println("Seeding suppliers...")
	suppliers := []models.Supplier{
		{Name: "Tech Distributors Inc", Code: "SUP001", Email: "sales@techdist.com", Phone: "+1234567891", City: "New York", Country: "USA"},
		{Name: "Global Supply Co", Code: "SUP002", Email: "orders@globalsupply.com", Phone: "+1234567892", City: "Los Angeles", Country: "USA"},
		{Name: "Quality Parts Ltd", Code: "SUP003", Email: "info@qualityparts.com", Phone: "+1234567893", City: "Chicago", Country: "USA"},
	}

	for _, sup := range suppliers {
		var existing models.Supplier
		result := db.Where("code = ?", sup.Code).First(&existing)
		if result.RowsAffected == 0 {
			if err := db.Create(&sup).Error; err != nil {
				return err
			}
			log.Printf("  [CREATED] Supplier: %s", sup.Code)
		} else {
			log.Printf("  [EXISTS] Supplier: %s", sup.Code)
		}
	}
	return nil
}

func seedProducts(db *gorm.DB) error {
	log.Println("Seeding sample products...")

	var catElectronics, catClothing, catOffice models.Category
	db.Where("name = ?", "Electronics").First(&catElectronics)
	db.Where("name = ?", "Clothing").First(&catClothing)
	db.Where("name = ?", "Office Supplies").First(&catOffice)

	var supTech, supGlobal, supQuality models.Supplier
	db.Where("code = ?", "SUP001").First(&supTech)
	db.Where("code = ?", "SUP002").First(&supGlobal)
	db.Where("code = ?", "SUP003").First(&supQuality)

	products := []struct {
		product  models.Product
		supplier models.Supplier
	}{
		{models.Product{SKU: "ELEC001", Name: "Wireless Mouse", Description: "Ergonomic wireless mouse", CategoryID: &catElectronics.ID, Unit: "PCS", CostPrice: 15.00, SellPrice: 29.99, ReorderPoint: 20, IsActive: true}, supTech},
		{models.Product{SKU: "ELEC002", Name: "USB-C Hub", Description: "7-port USB-C hub", CategoryID: &catElectronics.ID, Unit: "PCS", CostPrice: 25.00, SellPrice: 49.99, ReorderPoint: 15, IsActive: true}, supTech},
		{models.Product{SKU: "ELEC003", Name: "Mechanical Keyboard", Description: "RGB mechanical keyboard", CategoryID: &catElectronics.ID, Unit: "PCS", CostPrice: 45.00, SellPrice: 89.99, ReorderPoint: 10, IsActive: true}, supGlobal},
		{models.Product{SKU: "CLTH001", Name: "Cotton T-Shirt", Description: "100% cotton t-shirt", CategoryID: &catClothing.ID, Unit: "PCS", CostPrice: 8.00, SellPrice: 24.99, ReorderPoint: 50, IsActive: true}, supQuality},
		{models.Product{SKU: "CLTH002", Name: "Denim Jeans", Description: "Classic fit denim jeans", CategoryID: &catClothing.ID, Unit: "PCS", CostPrice: 20.00, SellPrice: 59.99, ReorderPoint: 30, IsActive: true}, supQuality},
		{models.Product{SKU: "OFFC001", Name: "Ballpoint Pens (Box)", Description: "Box of 50 ballpoint pens", CategoryID: &catOffice.ID, Unit: "BOX", CostPrice: 5.00, SellPrice: 12.99, ReorderPoint: 25, IsActive: true}, supGlobal},
		{models.Product{SKU: "OFFC002", Name: "A4 Paper (Ream)", Description: "500 sheets A4 paper", CategoryID: &catOffice.ID, Unit: "REAM", CostPrice: 3.50, SellPrice: 8.99, ReorderPoint: 40, IsActive: true}, supGlobal},
	}

	for _, item := range products {
		var existing models.Product
		result := db.Where("sku = ?", item.product.SKU).First(&existing)
		if result.RowsAffected == 0 {
			if err := db.Create(&item.product).Error; err != nil {
				return err
			}
			log.Printf("  [CREATED] Product: %s", item.product.SKU)

			ps := models.ProductSupplier{
				ProductID:  item.product.ID,
				SupplierID: item.supplier.ID,
			}
			db.Create(&ps)

			var wh models.Warehouse
			db.Where("is_primary = ?", true).First(&wh)

			inv := models.Inventory{
				ProductID:   item.product.ID,
				WarehouseID: wh.ID,
				Quantity:    item.product.ReorderPoint * 3,
			}
			db.Create(&inv)
			log.Printf("    -> Added inventory: %d units", inv.Quantity)
		} else {
			log.Printf("  [EXISTS] Product: %s", item.product.SKU)
		}
	}
	return nil
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func seedLocations(db *gorm.DB) error {
	log.Println("Seeding storage locations...")

	zones := []string{"A", "B", "C"}
	aisles := []string{"01", "02", "03"}
	racks := []string{"R1", "R2"}
	shelves := []string{"S1", "S2"}
	bins := []string{"B1", "B2"}

	var warehouses []models.Warehouse
	db.Where("is_active = ?", true).Find(&warehouses)

	for _, wh := range warehouses {
		for _, zone := range zones {
			for _, aisle := range aisles {
				for _, rack := range racks {
					for _, shelf := range shelves {
						for _, bin := range bins {
							code := zone + "-" + aisle + "-" + rack + "-" + shelf + "-" + bin

							var existing models.Location
							result := db.Where("code = ?", code).First(&existing)
							if result.RowsAffected == 0 {
								location := models.Location{
									WarehouseID: wh.ID,
									Zone:        zone,
									Aisle:       aisle,
									Rack:        rack,
									Shelf:       shelf,
									Bin:         bin,
									Code:        code,
									MaxCapacity: 100,
									IsActive:    true,
								}
								if err := db.Create(&location).Error; err != nil {
									return err
								}
								log.Printf("  [CREATED] Location: %s (%s)", code, wh.Code)
							}
						}
					}
				}
			}
		}
	}
	return nil
}
