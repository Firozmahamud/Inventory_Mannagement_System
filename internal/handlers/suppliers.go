package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"inventory-system/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListSuppliers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var suppliers []models.Supplier
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.Supplier{}).Count(&total)

		if err := db.Preload("Creator").Preload("Updater").Order("created_at DESC").Offset(offset).Limit(limit).Find(&suppliers).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       suppliers,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetSupplier(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var supplier models.Supplier
		if err := db.Preload("Creator").Preload("Updater").First(&supplier, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
			return
		}

		c.JSON(http.StatusOK, supplier)
	}
}

func generateSupplierCode(db *gorm.DB) (string, error) {
	var maxCode string
	db.Model(&models.Supplier{}).Select("code").Order("created_at DESC").Limit(1).Pluck("code", &maxCode)

	var nextNum int = 1
	if maxCode != "" {
		_, err := fmt.Sscanf(maxCode, "SUP%d", &nextNum)
		if err != nil {
			nextNum = 1
		}
		nextNum++
	}

	return fmt.Sprintf("SUP%03d", nextNum), nil
}

func CreateSupplier(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Name          string `json:"name" binding:"required"`
			Email         string `json:"email"`
			Phone         string `json:"phone"`
			Address       string `json:"address"`
			City          string `json:"city"`
			Country       string `json:"country"`
			ContactPerson string `json:"contact_person"`
			Notes         string `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		code, err := generateSupplierCode(db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate supplier code"})
			return
		}

		userIDStr := c.GetString("userID")
		var userID *uuid.UUID
		if uid, err := uuid.Parse(userIDStr); err == nil {
			userID = &uid
		}

		supplier := models.Supplier{
			Name:          input.Name,
			Code:          code,
			Email:         input.Email,
			Phone:         input.Phone,
			Address:       input.Address,
			City:          input.City,
			Country:       input.Country,
			ContactPerson: input.ContactPerson,
			Notes:         input.Notes,
			CreatedBy:     userID,
			UpdatedBy:     userID,
		}

		if err := db.Create(&supplier).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create supplier: " + err.Error()})
			return
		}

		db.Preload("Creator").Preload("Updater").First(&supplier, supplier.ID)

		c.JSON(http.StatusCreated, supplier)
	}
}

func UpdateSupplier(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var supplier models.Supplier
		if err := db.First(&supplier, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
			return
		}

		var input struct {
			Name          string `json:"name"`
			Email         string `json:"email"`
			Phone         string `json:"phone"`
			Address       string `json:"address"`
			City          string `json:"city"`
			Country       string `json:"country"`
			ContactPerson string `json:"contact_person"`
			Notes         string `json:"notes"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userIDStr := c.GetString("userID")
		if uid, err := uuid.Parse(userIDStr); err == nil {
			supplier.UpdatedBy = &uid
		}

		if input.Name != "" {
			supplier.Name = input.Name
		}
		if input.Email != "" {
			supplier.Email = input.Email
		}
		if input.Phone != "" {
			supplier.Phone = input.Phone
		}
		if input.Address != "" {
			supplier.Address = input.Address
		}
		if input.City != "" {
			supplier.City = input.City
		}
		if input.Country != "" {
			supplier.Country = input.Country
		}
		if input.ContactPerson != "" {
			supplier.ContactPerson = input.ContactPerson
		}
		if input.Notes != "" {
			supplier.Notes = input.Notes
		}

		if err := db.Save(&supplier).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update supplier"})
			return
		}

		db.Preload("Creator").Preload("Updater").First(&supplier, supplier.ID)

		c.JSON(http.StatusOK, supplier)
	}
}

func DeleteSupplier(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		if err := db.Delete(&models.Supplier{}, uid).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete supplier"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Supplier deleted successfully"})
	}
}
