package handlers

import (
	"net/http"
	"strconv"
	"time"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListCategories(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var categories []models.Category
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "1000"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.Category{}).Count(&total)

		if err := db.Order("created_at DESC").Offset(offset).Limit(limit).
			Preload("Creator").Preload("Updater").
			Find(&categories).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		type CategoryWithCount struct {
			ID           uuid.UUID    `json:"id"`
			Name         string       `json:"name"`
			Description  string       `json:"description"`
			ParentID     *uuid.UUID   `json:"parent_id"`
			Image        string       `json:"image"`
			IsActive     bool         `json:"is_active"`
			CreatedBy    *uuid.UUID   `json:"created_by"`
			UpdatedBy    *uuid.UUID   `json:"updated_by"`
			CreatedAt    time.Time    `json:"created_at"`
			UpdatedAt    time.Time    `json:"updated_at"`
			Creator      *models.User `json:"creator,omitempty"`
			Updater      *models.User `json:"updater,omitempty"`
			ProductCount int64        `json:"product_count"`
		}

		categoriesWithCount := make([]CategoryWithCount, len(categories))
		for i, cat := range categories {
			var count int64
			db.Model(&models.Product{}).Where("category_id = ?", cat.ID).Count(&count)
			categoriesWithCount[i] = CategoryWithCount{
				ID:           cat.ID,
				Name:         cat.Name,
				Description:  cat.Description,
				ParentID:     cat.ParentID,
				Image:        cat.Image,
				IsActive:     cat.IsActive,
				CreatedBy:    cat.CreatedBy,
				UpdatedBy:    cat.UpdatedBy,
				CreatedAt:    cat.CreatedAt,
				UpdatedAt:    cat.UpdatedAt,
				Creator:      cat.Creator,
				Updater:      cat.Updater,
				ProductCount: count,
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       categoriesWithCount,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetCategory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var category models.Category
		if err := db.First(&category, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
			return
		}

		c.JSON(http.StatusOK, category)
	}
}

func CreateCategory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Name        string     `json:"name" binding:"required"`
			Description string     `json:"description"`
			ParentID    *uuid.UUID `json:"parent_id"`
			Image       string     `json:"image"`
			IsActive    bool       `json:"is_active"`
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

		category := models.Category{
			Name:        input.Name,
			Description: input.Description,
			ParentID:    input.ParentID,
			Image:       input.Image,
			IsActive:    input.IsActive,
			CreatedBy:   creatorID,
		}

		if err := db.Create(&category).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
			return
		}

		c.JSON(http.StatusCreated, category)
	}
}

func UpdateCategory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var category models.Category
		if err := db.First(&category, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
			return
		}

		var input struct {
			Name        string     `json:"name"`
			Description string     `json:"description"`
			ParentID    *uuid.UUID `json:"parent_id"`
			Image       string     `json:"image"`
			IsActive    bool       `json:"is_active"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if userIDStr := c.GetString("userID"); userIDStr != "" {
			if id, err := uuid.Parse(userIDStr); err == nil {
				category.UpdatedBy = &id
			}
		}

		if input.Name != "" {
			category.Name = input.Name
		}
		if input.Description != "" {
			category.Description = input.Description
		}
		category.ParentID = input.ParentID
		if input.Image != "" {
			category.Image = input.Image
		}
		category.IsActive = input.IsActive

		if err := db.Save(&category).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
			return
		}

		c.JSON(http.StatusOK, category)
	}
}

func DeleteCategory(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		if err := db.Delete(&models.Category{}, uid).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
	}
}
