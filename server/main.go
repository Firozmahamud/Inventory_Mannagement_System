package main

import (
	"log"
	"os"

	"inventory-system/internal/database"
	"inventory-system/internal/handlers"
	"inventory-system/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	if err := database.Seed(db); err != nil {
		log.Fatalf("Failed to seed database: %v", err)
	}

	middleware.InitMiddleware(db)

	r := gin.Default()

	public := r.Group("/api/v1")
	{
		public.POST("/auth/login", handlers.Login(db))
		public.POST("/auth/register", handlers.Register(db))
		public.POST("/auth/refresh", handlers.RefreshToken(db))
	}

	protected := r.Group("/api/v1")
	protected.Use(middleware.AuthMiddleware())
	{
		auth := protected.Group("/auth")
		{
			auth.GET("/me", handlers.GetCurrentUser(db))
			auth.POST("/logout", handlers.Logout(db))
			auth.PUT("/change-password", handlers.ChangePassword(db))
		}

		// Users - granular permissions
		users := protected.Group("/users")
		{
			users.GET("", middleware.PermissionMiddleware("view_users"), handlers.ListUsers(db))
			users.GET("/:id", middleware.PermissionMiddleware("view_users"), handlers.GetUser(db))
			users.POST("", middleware.PermissionMiddleware("create_users"), handlers.CreateUser(db))
			users.PUT("/:id", middleware.PermissionMiddleware("update_users"), handlers.UpdateUser(db))
			users.DELETE("/:id", middleware.PermissionMiddleware("delete_users"), handlers.DeleteUser(db))
			users.PUT("/:id/roles", middleware.PermissionMiddleware("update_users"), handlers.UpdateUserRoles(db))
		}

		// Categories
		categories := protected.Group("/categories")
		{
			categories.GET("", middleware.PermissionMiddleware("view_products"), handlers.ListCategories(db))
			categories.GET("/:id", middleware.PermissionMiddleware("view_products"), handlers.GetCategory(db))
			categories.POST("", middleware.PermissionMiddleware("create_products"), handlers.CreateCategory(db))
			categories.PUT("/:id", middleware.PermissionMiddleware("update_products"), handlers.UpdateCategory(db))
			categories.DELETE("/:id", middleware.PermissionMiddleware("delete_products"), handlers.DeleteCategory(db))
		}

		// Products - granular permissions
		products := protected.Group("/products")
		{
			products.GET("", middleware.PermissionMiddleware("view_products"), handlers.ListProducts(db))
			products.GET("/:id", middleware.PermissionMiddleware("view_products"), handlers.GetProduct(db))
			products.POST("", middleware.PermissionMiddleware("create_products"), handlers.CreateProduct(db))
			products.PUT("/:id", middleware.PermissionMiddleware("update_products"), handlers.UpdateProduct(db))
			products.DELETE("/:id", middleware.PermissionMiddleware("delete_products"), handlers.DeleteProduct(db))
		}

		// Suppliers - granular permissions
		suppliers := protected.Group("/suppliers")
		{
			suppliers.GET("", middleware.PermissionMiddleware("view_suppliers"), handlers.ListSuppliers(db))
			suppliers.GET("/:id", middleware.PermissionMiddleware("view_suppliers"), handlers.GetSupplier(db))
			suppliers.POST("", middleware.PermissionMiddleware("create_suppliers"), handlers.CreateSupplier(db))
			suppliers.PUT("/:id", middleware.PermissionMiddleware("update_suppliers"), handlers.UpdateSupplier(db))
			suppliers.DELETE("/:id", middleware.PermissionMiddleware("delete_suppliers"), handlers.DeleteSupplier(db))
		}

		// Warehouses - granular permissions
		warehouses := protected.Group("/warehouses")
		{
			warehouses.GET("", middleware.PermissionMiddleware("view_warehouses"), handlers.ListWarehouses(db))
			warehouses.GET("/:id/locations", middleware.PermissionMiddleware("view_inventory"), handlers.GetLocationsByWarehouse(db))
			warehouses.GET("/:id", middleware.PermissionMiddleware("view_warehouses"), handlers.GetWarehouse(db))
			warehouses.POST("", middleware.PermissionMiddleware("create_warehouses"), handlers.CreateWarehouse(db))
			warehouses.PUT("/:id", middleware.PermissionMiddleware("update_warehouses"), handlers.UpdateWarehouse(db))
			warehouses.DELETE("/:id", middleware.PermissionMiddleware("delete_warehouses"), handlers.DeleteWarehouse(db))
		}

		// Locations - WMS
		locations := protected.Group("/locations")
		{
			locations.GET("", middleware.PermissionMiddleware("view_inventory"), handlers.ListLocations(db))
			locations.GET("/:id", middleware.PermissionMiddleware("view_inventory"), handlers.GetLocation(db))
			locations.POST("", middleware.PermissionMiddleware("create_warehouses"), handlers.CreateLocation(db))
			locations.PUT("/:id", middleware.PermissionMiddleware("update_warehouses"), handlers.UpdateLocation(db))
			locations.DELETE("/:id", middleware.PermissionMiddleware("delete_warehouses"), handlers.DeleteLocation(db))
			locations.GET("/:id/contents", middleware.PermissionMiddleware("view_inventory"), handlers.GetLocationContents(db))
			locations.GET("/suggest", middleware.PermissionMiddleware("view_inventory"), handlers.SuggestLocation(db))
		}

		// Inventory - granular permissions
		inventory := protected.Group("/inventory")
		{
			inventory.GET("", middleware.PermissionMiddleware("view_inventory"), handlers.ListInventory(db))
			inventory.GET("/:id", middleware.PermissionMiddleware("view_inventory"), handlers.GetInventory(db))
			inventory.POST("", middleware.PermissionMiddleware("create_inventory"), handlers.CreateInventory(db))
			inventory.PUT("/:id", middleware.PermissionMiddleware("update_inventory"), handlers.UpdateInventory(db))
			inventory.POST("/assign-location", middleware.PermissionMiddleware("update_inventory"), handlers.AssignLocation(db))
			inventory.POST("/move", middleware.PermissionMiddleware("update_inventory"), handlers.MoveStock(db))
		}

		// Stock operations
		stock := protected.Group("/stock")
		{
			stock.GET("/transactions", middleware.PermissionMiddleware("view_inventory"), handlers.ListStockTransactions(db))
			stock.POST("/in", middleware.PermissionMiddleware("create_inventory"), handlers.CreateStockIn(db))
			stock.POST("/out", middleware.PermissionMiddleware("create_inventory"), handlers.CreateStockOut(db))
			stock.POST("/transfer", middleware.PermissionMiddleware("update_inventory"), handlers.CreateStockTransfer(db))
			stock.POST("/adjustment", middleware.PermissionMiddleware("update_inventory"), handlers.CreateStockAdjustment(db))
		}

		// Roles - granular permissions
		roles := protected.Group("/roles")
		{
			roles.GET("", middleware.PermissionMiddleware("view_roles"), handlers.ListRoles(db))
			roles.GET("/:id", middleware.PermissionMiddleware("view_roles"), handlers.GetRole(db))
			roles.POST("", middleware.PermissionMiddleware("create_roles"), handlers.CreateRole(db))
			roles.PUT("/:id", middleware.PermissionMiddleware("update_roles"), handlers.UpdateRole(db))
			roles.DELETE("/:id", middleware.PermissionMiddleware("delete_roles"), handlers.DeleteRole(db))
			roles.POST("/:id/permissions", middleware.PermissionMiddleware("manage_permissions"), handlers.AssignPermissionsToRole(db))
		}

		// Permissions - view only
		permissions := protected.Group("/permissions")
		{
			permissions.GET("", handlers.ListPermissions(db))
		}

		// User roles
		userRoles := protected.Group("/user-roles")
		{
			userRoles.GET("/:userId", handlers.GetUserRoles(db))
			userRoles.POST("", middleware.PermissionMiddleware("update_users"), handlers.AssignRole(db))
			userRoles.DELETE("", middleware.PermissionMiddleware("update_users"), handlers.RemoveRole(db))
		}

		// Dashboard
		dashboard := protected.Group("/dashboard")
		{
			dashboard.GET("/stats", middleware.PermissionMiddleware("view_dashboard"), handlers.GetDashboardStats(db))
			dashboard.GET("/charts/sales", middleware.PermissionMiddleware("view_reports"), handlers.GetSalesChart(db))
			dashboard.GET("/charts/stock", middleware.PermissionMiddleware("view_reports"), handlers.GetStockChart(db))
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	r.Run(":" + port)
}
