package handlers

import (
	"net/http"
	"strconv"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListProducts(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var products []models.Product
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.Product{}).Count(&total)

		if err := db.Order("created_at DESC").Offset(offset).Limit(limit).Preload("Category").Preload("ProductSuppliers.Supplier").Preload("Creator").Preload("Updater").Find(&products).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       products,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var product models.Product
		if err := db.Preload("Category").Preload("Inventories").First(&product, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		c.JSON(http.StatusOK, product)
	}
}

func CreateProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			SKU           string     `json:"sku" binding:"required"`
			Name          string     `json:"name" binding:"required"`
			Description   string     `json:"description"`
			CategoryID    *uuid.UUID `json:"category_id"`
			Unit          string     `json:"unit"`
			Barcode       string     `json:"barcode"`
			Image         string     `json:"image"`
			CostPrice     float64    `json:"cost_price"`
			SellPrice     float64    `json:"sell_price"`
			Currency      string     `json:"currency"`
			MinStockLevel int        `json:"min_stock_level"`
			MaxStockLevel int        `json:"max_stock_level"`
			ReorderPoint  int        `json:"reorder_point"`
			IsActive      bool       `json:"is_active"`
			SupplierID    *uuid.UUID `json:"supplier_id"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var creatorID *uuid.UUID
		if userIDStr := c.GetString("userID"); userIDStr != "" {
			if id, err := uuid.Parse(userIDStr); err == nil {
				creatorID = &id
			}
		}

		unit := "PCS"
		if input.Unit != "" {
			unit = input.Unit
		}

		currency := "USD"
		if input.Currency != "" {
			currency = input.Currency
		}

		product := models.Product{
			SKU:           input.SKU,
			Name:          input.Name,
			Description:   input.Description,
			CategoryID:    input.CategoryID,
			Unit:          unit,
			Barcode:       input.Barcode,
			Image:         input.Image,
			CostPrice:     input.CostPrice,
			SellPrice:     input.SellPrice,
			Currency:      currency,
			MinStockLevel: input.MinStockLevel,
			MaxStockLevel: input.MaxStockLevel,
			ReorderPoint:  input.ReorderPoint,
			IsActive:      input.IsActive,
			CreatedBy:     creatorID,
		}

		tx := db.Begin()

		if err := tx.Create(&product).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
			return
		}

		if input.SupplierID != nil {
			productSupplier := models.ProductSupplier{
				ProductID:  product.ID,
				SupplierID: *input.SupplierID,
			}
			if err := tx.Create(&productSupplier).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign supplier"})
				return
			}
		}

		tx.Commit()

		db.Preload("Category").Preload("ProductSuppliers.Supplier").First(&product, product.ID)
		c.JSON(http.StatusCreated, product)
	}
}

func UpdateProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var product models.Product
		if err := db.First(&product, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			return
		}

		var input struct {
			SKU           string     `json:"sku"`
			Name          string     `json:"name"`
			Description   string     `json:"description"`
			CategoryID    *uuid.UUID `json:"category_id"`
			Unit          string     `json:"unit"`
			Barcode       string     `json:"barcode"`
			Image         string     `json:"image"`
			CostPrice     float64    `json:"cost_price"`
			SellPrice     float64    `json:"sell_price"`
			Currency      string     `json:"currency"`
			MinStockLevel int        `json:"min_stock_level"`
			MaxStockLevel int        `json:"max_stock_level"`
			ReorderPoint  int        `json:"reorder_point"`
			IsActive      bool       `json:"is_active"`
			SupplierID    *uuid.UUID `json:"supplier_id"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var updaterID *uuid.UUID
		if userIDStr := c.GetString("userID"); userIDStr != "" {
			if id, err := uuid.Parse(userIDStr); err == nil {
				updaterID = &id
			}
		}

		tx := db.Begin()

		if input.SKU != "" {
			product.SKU = input.SKU
		}
		if input.Name != "" {
			product.Name = input.Name
		}
		if input.Description != "" {
			product.Description = input.Description
		}
		product.CategoryID = input.CategoryID
		if input.Unit != "" {
			product.Unit = input.Unit
		}
		if input.Barcode != "" {
			product.Barcode = input.Barcode
		}
		if input.Image != "" {
			product.Image = input.Image
		}
		product.CostPrice = input.CostPrice
		product.SellPrice = input.SellPrice
		if input.Currency != "" {
			product.Currency = input.Currency
		}
		product.MinStockLevel = input.MinStockLevel
		product.MaxStockLevel = input.MaxStockLevel
		product.ReorderPoint = input.ReorderPoint
		product.IsActive = input.IsActive
		product.UpdatedBy = updaterID

		if err := tx.Save(&product).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
			return
		}

		if input.SupplierID != nil {
			var existing models.ProductSupplier
			result := tx.Where("product_id = ?", product.ID).First(&existing)

			if result.RowsAffected == 0 {
				productSupplier := models.ProductSupplier{
					ProductID:  product.ID,
					SupplierID: *input.SupplierID,
				}
				tx.Create(&productSupplier)
			} else {
				tx.Model(&existing).Update("supplier_id", *input.SupplierID)
			}
		}

		tx.Commit()

		db.Preload("Category").Preload("ProductSuppliers.Supplier").First(&product, product.ID)
		c.JSON(http.StatusOK, product)
	}
}

func DeleteProduct(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		if err := db.Delete(&models.Product{}, uid).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
	}
}
