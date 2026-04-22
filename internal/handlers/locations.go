package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListLocations(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var locations []models.Location
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
		offset := (page - 1) * limit

		query := db.Model(&models.Location{})

		if warehouseID := c.Query("warehouse_id"); warehouseID != "" {
			query = query.Where("warehouse_id = ?", warehouseID)
		}

		if zone := c.Query("zone"); zone != "" {
			query = query.Where("zone = ?", zone)
		}

		if isActive := c.Query("is_active"); isActive != "" {
			query = query.Where("is_active = ?", isActive == "true")
		}

		var total int64
		query.Count(&total)

		if err := query.Offset(offset).Limit(limit).
			Preload("Warehouse").
			Preload("Inventories").
			Order("zone, aisle, rack, shelf, bin").
			Find(&locations).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		type LocationWithStock struct {
			models.Location
			CurrentStock int  `json:"current_stock"`
			Utilization  int  `json:"utilization"`
			IsEmpty      bool `json:"is_empty"`
			IsPartial    bool `json:"is_partial"`
			IsFull       bool `json:"is_full"`
		}

		locationsWithStock := make([]LocationWithStock, len(locations))
		for i, loc := range locations {
			var stock int
			for _, inv := range loc.Inventories {
				stock += inv.Quantity
			}
			utilization := 0
			if loc.MaxCapacity > 0 {
				utilization = (stock * 100) / loc.MaxCapacity
			}
			locationsWithStock[i] = LocationWithStock{
				Location:     loc,
				CurrentStock: stock,
				Utilization:  utilization,
				IsEmpty:      stock == 0,
				IsPartial:    stock > 0 && utilization < 90,
				IsFull:       utilization >= 90,
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       locationsWithStock,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetLocation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var location models.Location
		if err := db.Preload("Warehouse").Preload("Inventories.Product").First(&location, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}

		c.JSON(http.StatusOK, location)
	}
}

func CreateLocation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			WarehouseID uuid.UUID `json:"warehouse_id" binding:"required"`
			Zone        string    `json:"zone" binding:"required"`
			Aisle       string    `json:"aisle" binding:"required"`
			Rack        string    `json:"rack" binding:"required"`
			Shelf       string    `json:"shelf" binding:"required"`
			Bin         string    `json:"bin" binding:"required"`
			MaxCapacity int       `json:"max_capacity"`
			IsActive    bool      `json:"is_active"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		code := fmt.Sprintf("%s-%s-%s-%s-%s",
			strings.ToUpper(input.Zone),
			strings.ToUpper(input.Aisle),
			strings.ToUpper(input.Rack),
			strings.ToUpper(input.Shelf),
			strings.ToUpper(input.Bin))

		var existing models.Location
		if err := db.Where("code = ?", code).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Location with this code already exists"})
			return
		}

		maxCapacity := 100
		if input.MaxCapacity > 0 {
			maxCapacity = input.MaxCapacity
		}

		location := models.Location{
			WarehouseID: input.WarehouseID,
			Zone:        strings.ToUpper(input.Zone),
			Aisle:       strings.ToUpper(input.Aisle),
			Rack:        strings.ToUpper(input.Rack),
			Shelf:       strings.ToUpper(input.Shelf),
			Bin:         strings.ToUpper(input.Bin),
			Code:        code,
			MaxCapacity: maxCapacity,
			IsActive:    input.IsActive,
		}

		if err := db.Create(&location).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create location"})
			return
		}

		db.Preload("Warehouse").First(&location, location.ID)
		c.JSON(http.StatusCreated, location)
	}
}

func UpdateLocation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var location models.Location
		if err := db.First(&location, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}

		var input struct {
			Zone        string `json:"zone"`
			Aisle       string `json:"aisle"`
			Rack        string `json:"rack"`
			Shelf       string `json:"shelf"`
			Bin         string `json:"bin"`
			MaxCapacity int    `json:"max_capacity"`
			IsActive    bool   `json:"is_active"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if input.Zone != "" {
			location.Zone = strings.ToUpper(input.Zone)
		}
		if input.Aisle != "" {
			location.Aisle = strings.ToUpper(input.Aisle)
		}
		if input.Rack != "" {
			location.Rack = strings.ToUpper(input.Rack)
		}
		if input.Shelf != "" {
			location.Shelf = strings.ToUpper(input.Shelf)
		}
		if input.Bin != "" {
			location.Bin = strings.ToUpper(input.Bin)
		}

		location.Code = fmt.Sprintf("%s-%s-%s-%s-%s",
			location.Zone, location.Aisle, location.Rack, location.Shelf, location.Bin)

		if input.MaxCapacity > 0 {
			location.MaxCapacity = input.MaxCapacity
		}
		location.IsActive = input.IsActive

		if err := db.Save(&location).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update location"})
			return
		}

		db.Preload("Warehouse").First(&location, location.ID)
		c.JSON(http.StatusOK, location)
	}
}

func DeleteLocation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var location models.Location
		if err := db.First(&location, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}

		var inventoryCount int64
		db.Model(&models.Inventory{}).Where("location_id = ? AND quantity > 0", uid).Count(&inventoryCount)
		if inventoryCount > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete location with existing inventory"})
			return
		}

		if err := db.Delete(&location).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete location"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Location deleted successfully"})
	}
}

func GetLocationsByWarehouse(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		warehouseID := c.Param("warehouseId")
		uid, err := uuid.Parse(warehouseID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid warehouse ID"})
			return
		}

		var locations []models.Location
		if err := db.Where("warehouse_id = ? AND is_active = ?", uid, true).
			Preload("Inventories").
			Order("zone, aisle, rack, shelf, bin").
			Find(&locations).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, locations)
	}
}

func GetLocationContents(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var location models.Location
		if err := db.First(&location, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}

		var inventory []models.Inventory
		if err := db.Where("location_id = ?", uid).
			Preload("Product").
			Preload("Product.Category").
			Find(&inventory).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		type LocationContent struct {
			Location      models.Location    `json:"location"`
			Contents      []models.Inventory `json:"contents"`
			TotalItems    int                `json:"total_items"`
			TotalQuantity int                `json:"total_quantity"`
		}

		totalQty := 0
		for _, inv := range inventory {
			totalQty += inv.Quantity
		}

		c.JSON(http.StatusOK, LocationContent{
			Location:      location,
			Contents:      inventory,
			TotalItems:    len(inventory),
			TotalQuantity: totalQty,
		})
	}
}

func SuggestLocation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productIDStr := c.Query("product_id")
		warehouseIDStr := c.Query("warehouse_id")
		quantity, _ := strconv.Atoi(c.Query("quantity"))

		query := db.Model(&models.Location{}).Where("is_active = ?", true)

		if warehouseIDStr != "" {
			uid, _ := uuid.Parse(warehouseIDStr)
			query = query.Where("warehouse_id = ?", uid)
		}

		var locations []models.Location
		query.Preload("Inventories").Find(&locations)

		type Suggestion struct {
			Location       models.Location `json:"location"`
			CurrentStock   int             `json:"current_stock"`
			AvailableSpace int             `json:"available_space"`
			Reason         string          `json:"reason"`
		}

		var suggestions []Suggestion

		for _, loc := range locations {
			currentStock := 0
			for _, inv := range loc.Inventories {
				currentStock += inv.Quantity
			}
			availableSpace := loc.MaxCapacity - currentStock

			if availableSpace >= quantity {
				var lastStockIn *time.Time
				for _, inv := range loc.Inventories {
					if productIDStr != "" {
						uid, _ := uuid.Parse(productIDStr)
						if inv.ProductID == uid {
							if lastStockIn == nil || (inv.LastStockIn != nil && inv.LastStockIn.Before(*lastStockIn)) {
								lastStockIn = inv.LastStockIn
							}
						}
					}
				}

				reason := "Available space"
				if lastStockIn != nil {
					reason = "Same product - FIFO based"
				} else if currentStock == 0 {
					reason = "Empty location - load balancing"
				}

				suggestions = append(suggestions, Suggestion{
					Location:       loc,
					CurrentStock:   currentStock,
					AvailableSpace: availableSpace,
					Reason:         reason,
				})
			}
		}

		sort.Slice(suggestions, func(i, j int) bool {
			if suggestions[i].Location.Zone != suggestions[j].Location.Zone {
				return suggestions[i].Location.Zone < suggestions[j].Location.Zone
			}
			if suggestions[i].Location.Aisle != suggestions[j].Location.Aisle {
				return suggestions[i].Location.Aisle < suggestions[j].Location.Aisle
			}
			return suggestions[i].CurrentStock < suggestions[j].CurrentStock
		})

		if len(suggestions) > 10 {
			suggestions = suggestions[:10]
		}

		c.JSON(http.StatusOK, suggestions)
	}
}

func AssignLocation(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			InventoryID uuid.UUID `json:"inventory_id" binding:"required"`
			LocationID  uuid.UUID `json:"location_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var inventory models.Inventory
		if err := db.First(&inventory, input.InventoryID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inventory record not found"})
			return
		}

		var location models.Location
		if err := db.First(&location, input.LocationID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Location not found"})
			return
		}

		if inventory.WarehouseID != location.WarehouseID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Location must be in the same warehouse"})
			return
		}

		var existingInLocation models.Inventory
		result := db.Where("location_id = ? AND product_id = ?", input.LocationID, inventory.ProductID).First(&existingInLocation)
		if result.RowsAffected > 0 {
			existingInLocation.Quantity += inventory.Quantity
			db.Save(&existingInLocation)
			db.Delete(&inventory)
			db.Preload("Product").Preload("Location").First(&existingInLocation, existingInLocation.ID)
			c.JSON(http.StatusOK, existingInLocation)
			return
		}

		inventory.LocationID = &input.LocationID
		if err := db.Save(&inventory).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign location"})
			return
		}

		db.Preload("Product").Preload("Location").First(&inventory, inventory.ID)
		c.JSON(http.StatusOK, inventory)
	}
}

func MoveStock(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			FromLocationID uuid.UUID `json:"from_location_id" binding:"required"`
			ToLocationID   uuid.UUID `json:"to_location_id" binding:"required"`
			ProductID      uuid.UUID `json:"product_id" binding:"required"`
			Quantity       int       `json:"quantity" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var fromLocation, toLocation models.Location
		if err := db.First(&fromLocation, input.FromLocationID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Source location not found"})
			return
		}
		if err := db.First(&toLocation, input.ToLocationID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Destination location not found"})
			return
		}

		if fromLocation.WarehouseID != toLocation.WarehouseID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot move stock between different warehouses"})
			return
		}

		var fromInventory models.Inventory
		if err := db.Where("location_id = ? AND product_id = ?", input.FromLocationID, input.ProductID).First(&fromInventory).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found in source location"})
			return
		}

		if fromInventory.Quantity < input.Quantity {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient quantity in source location"})
			return
		}

		var toInventory models.Inventory
		result := db.Where("location_id = ? AND product_id = ?", input.ToLocationID, input.ProductID).First(&toInventory)

		tx := db.Begin()

		fromInventory.Quantity -= input.Quantity
		fromInventory.LastStockOut = func() *time.Time { t := time.Now(); return &t }()
		if err := tx.Save(&fromInventory).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update source inventory"})
			return
		}

		now := time.Now()
		if result.RowsAffected == 0 {
			toInventory = models.Inventory{
				ProductID:   input.ProductID,
				WarehouseID: fromLocation.WarehouseID,
				LocationID:  &input.ToLocationID,
				Quantity:    input.Quantity,
				LastStockIn: &now,
			}
			if err := tx.Create(&toInventory).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create destination inventory"})
				return
			}
		} else {
			toInventory.Quantity += input.Quantity
			toInventory.LastStockIn = &now
			if err := tx.Save(&toInventory).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update destination inventory"})
				return
			}
		}

		if fromInventory.Quantity == 0 {
			tx.Delete(&fromInventory)
		}

		transaction := models.StockTransaction{
			TransactionNo:   generateTransactionNo(db, "MOVE"),
			TransactionType: models.TransactionTransfer,
			ProductID:       input.ProductID,
			FromLocationID:  &input.FromLocationID,
			ToLocationID:    &input.ToLocationID,
			Quantity:        input.Quantity,
			CreatedBy:       func() *uuid.UUID { uid, _ := uuid.Parse(c.GetString("userID")); return &uid }(),
			Status:          models.TransactionApproved,
		}
		tx.Create(&transaction)

		tx.Commit()

		c.JSON(http.StatusOK, gin.H{
			"message":        "Stock moved successfully",
			"from_inventory": fromInventory,
			"to_inventory":   toInventory,
		})
	}
}
