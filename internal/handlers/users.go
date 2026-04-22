package handlers

import (
	"net/http"
	"strconv"

	"inventory-system/internal/models"
	"inventory-system/internal/services"
	"inventory-system/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func ListUsers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var users []models.User
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.User{}).Count(&total)

		if err := db.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       users,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var user models.User
		if err := db.Preload("Roles.Role").First(&user, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}

// CreateUser creates a new user with optional roles assignment
// RoleIDs is optional - if not provided, assigns default role (VIEWER)
func CreateUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Email     string   `json:"email" binding:"required,email"`
			Password  string   `json:"password" binding:"required,min=6"`
			FirstName string   `json:"first_name" binding:"required"`
			LastName  string   `json:"last_name" binding:"required"`
			Phone    string   `json:"phone"`
			IsActive  bool     `json:"is_active"`
			Avatar   string   `json:"avatar"`
			RoleIDs  []string `json:"role_ids"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existingUser models.User
		if err := db.Where("email = ?", input.Email).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}

		hashedPassword, err := utils.HashPassword(input.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		user := models.User{
			Email:        input.Email,
			PasswordHash: hashedPassword,
			FirstName:    input.FirstName,
			LastName:    input.LastName,
			Phone:      input.Phone,
			IsActive:   input.IsActive,
			Avatar:     input.Avatar,
		}

		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		userRoles := []models.UserRole{}

		if len(input.RoleIDs) > 0 {
			for _, roleIDStr := range input.RoleIDs {
				roleUID, err := uuid.Parse(roleIDStr)
				if err != nil {
					continue
				}

				var role models.Role
				if err := tx.First(&role, roleUID).Error; err != nil {
					continue
				}

				userRole := models.UserRole{
					UserID: user.ID,
					RoleID: roleUID,
				}
				userRoles = append(userRoles, userRole)
			}
		}

		if len(userRoles) == 0 {
			rbacService := services.NewRBACService(tx)
			defaultRole, err := rbacService.GetDefaultRole()
			if err == nil {
				userRole := models.UserRole{
					UserID: user.ID,
					RoleID: defaultRole.ID,
				}
				userRoles = append(userRoles, userRole)
			}
		}

		for _, ur := range userRoles {
			if err := tx.Create(&ur).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role"})
				return
			}
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		var roles []models.Role
		db.Table("roles").
			Select("roles.*").
			Joins("JOIN user_roles ON roles.id = user_roles.role_id").
			Where("user_roles.user_id = ?", user.ID).
			Find(&roles)

		c.JSON(http.StatusCreated, gin.H{
			"user":  user,
			"roles": roles,
		})
	}
}

// UpdateUser updates user profile and/or roles
// Supports updating both user details and role assignments via role_ids
func UpdateUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		var user models.User
		if err := db.First(&user, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		var input struct {
			FirstName string   `json:"first_name"`
			LastName string   `json:"last_name"`
			Phone   string   `json:"phone"`
			IsActive bool    `json:"is_active"`
			Avatar  string   `json:"avatar"`
			RoleIDs []string `json:"role_ids"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		updated := false
		if input.FirstName != "" {
			user.FirstName = input.FirstName
			updated = true
		}
		if input.LastName != "" {
			user.LastName = input.LastName
			updated = true
		}
		if input.Phone != "" {
			user.Phone = input.Phone
			updated = true
		}
		user.IsActive = input.IsActive
		user.Avatar = input.Avatar
		updated = true

		if updated {
			if err := tx.Save(&user).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
				return
			}
		}

		if input.RoleIDs != nil {
			rbacService := services.NewRBACService(tx)
			existingRoles, _ := rbacService.GetUserRoles(uid)
			if len(existingRoles) <= 0 && len(input.RoleIDs) == 0 {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "User must have at least one role"})
				return
			}

			if err := tx.Where("user_id = ?", uid).Delete(&models.UserRole{}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update roles"})
				return
			}

			for _, roleIDStr := range input.RoleIDs {
				roleUID, err := uuid.Parse(roleIDStr)
				if err != nil {
					continue
				}

				var role models.Role
				if err := tx.First(&role, roleUID).Error; err != nil {
					continue
				}

				userRole := models.UserRole{
					UserID: uid,
					RoleID: roleUID,
				}
				if err := tx.Create(&userRole).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role"})
					return
				}
			}
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}

		var roles []models.Role
		db.Table("roles").
			Select("roles.*").
			Joins("JOIN user_roles ON roles.id = user_roles.role_id").
			Where("user_roles.user_id = ?", user.ID).
			Find(&roles)

		db.First(&user, uid)

		c.JSON(http.StatusOK, gin.H{
			"user":  user,
			"roles": roles,
		})
	}
}

func DeleteUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
			return
		}

		if err := db.Where("user_id = ?", uid).Delete(&models.UserRole{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user roles"})
			return
		}

		if err := db.Delete(&models.User{}, uid).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
	}
}
