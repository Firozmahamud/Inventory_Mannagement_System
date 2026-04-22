package handlers

import (
	"net/http"
	"strconv"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var inventory []models.Inventory
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.Inventory{}).Count(&total)

		if err := db.Offset(offset).Limit(limit).Preload("Product").Preload("Warehouse").Find(&inventory).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       inventory,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var inv models.Inventory
		if err := db.Preload("Product").Preload("Warehouse").First(&inv, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
			return
		}

		c.JSON(http.StatusOK, inv)
	}
}

func CreateInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			ProductID   uuid.UUID `json:"product_id" binding:"required"`
			WarehouseID uuid.UUID `json:"warehouse_id" binding:"required"`
			Quantity    int       `json:"quantity"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		inv := models.Inventory{
			ProductID:   input.ProductID,
			WarehouseID: input.WarehouseID,
			Quantity:    input.Quantity,
		}

		if err := db.Create(&inv).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create inventory"})
			return
		}

		c.JSON(http.StatusCreated, inv)
	}
}

func UpdateInventory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var inv models.Inventory
		if err := db.First(&inv, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Inventory not found"})
			return
		}

		var input struct {
			Quantity int `json:"quantity"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		inv.Quantity = input.Quantity

		if err := db.Save(&inv).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update inventory"})
			return
		}

		c.JSON(http.StatusOK, inv)
	}
}
