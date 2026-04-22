package handlers

import (
	"net/http"
	"strconv"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListWarehouses(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var warehouses []models.Warehouse
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.Warehouse{}).Count(&total)

		if err := db.Order("is_primary DESC, created_at DESC").Offset(offset).Limit(limit).Find(&warehouses).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       warehouses,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetWarehouse(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var warehouse models.Warehouse
		if err := db.First(&warehouse, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Warehouse not found"})
			return
		}

		c.JSON(http.StatusOK, warehouse)
	}
}

func CreateWarehouse(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Name      string `json:"name" binding:"required"`
			Code      string `json:"code" binding:"required"`
			Address   string `json:"address"`
			City      string `json:"city"`
			Country   string `json:"country"`
			IsPrimary bool   `json:"is_primary"`
			IsActive  bool   `json:"is_active"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		warehouse := models.Warehouse{
			Name:      input.Name,
			Code:      input.Code,
			Address:   input.Address,
			City:      input.City,
			Country:   input.Country,
			IsPrimary: input.IsPrimary,
			IsActive:  input.IsActive,
		}

		if err := db.Create(&warehouse).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create warehouse"})
			return
		}

		c.JSON(http.StatusCreated, warehouse)
	}
}

func UpdateWarehouse(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var warehouse models.Warehouse
		if err := db.First(&warehouse, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Warehouse not found"})
			return
		}

		var input struct {
			Name      string `json:"name"`
			Code      string `json:"code"`
			Address   string `json:"address"`
			City      string `json:"city"`
			Country   string `json:"country"`
			IsPrimary bool   `json:"is_primary"`
			IsActive  bool   `json:"is_active"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if input.Name != "" {
			warehouse.Name = input.Name
		}
		if input.Code != "" {
			warehouse.Code = input.Code
		}
		if input.Address != "" {
			warehouse.Address = input.Address
		}
		if input.City != "" {
			warehouse.City = input.City
		}
		if input.Country != "" {
			warehouse.Country = input.Country
		}
		warehouse.IsPrimary = input.IsPrimary
		warehouse.IsActive = input.IsActive

		if err := db.Save(&warehouse).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update warehouse"})
			return
		}

		c.JSON(http.StatusOK, warehouse)
	}
}

func DeleteWarehouse(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		if err := db.Delete(&models.Warehouse{}, uid).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete warehouse"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Warehouse deleted successfully"})
	}
}
