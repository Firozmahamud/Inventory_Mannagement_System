package handlers

import (
	"net/http"

	"inventory-system/internal/models"
	"inventory-system/internal/services"
	"inventory-system/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func Login(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email    string `json:"email" binding:"required,email"`
			Password string `json:"password" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		if !utils.CheckPassword(req.Password, user.PasswordHash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
			return
		}

		if !user.IsActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account is disabled"})
			return
		}

		token, err := utils.GenerateToken(user.ID, user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		refreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
			return
		}

		rbacService := services.NewRBACService(db)

		permissions := []string{}
		if perms, err := rbacService.GetUserPermissions(user.ID); err == nil {
			permissions = perms
		}

		roles := []models.Role{}
		if userRoles, err := rbacService.GetUserRoles(user.ID); err == nil {
			roles = userRoles
		}

		c.JSON(http.StatusOK, gin.H{
			"token":         token,
			"refresh_token": refreshToken,
			"user":          user,
			"permissions":   permissions,
			"roles":         roles,
		})
	}
}

func Register(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Email     string `json:"email" binding:"required,email"`
			Password  string `json:"password" binding:"required,min=6"`
			FirstName string `json:"first_name" binding:"required"`
			LastName  string `json:"last_name" binding:"required"`
			Phone     string `json:"phone"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var existingUser models.User
		if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
			return
		}

		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		user := models.User{
			Email:        req.Email,
			PasswordHash: hashedPassword,
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			Phone:        req.Phone,
			IsActive:     true,
		}

		if err := db.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}

		token, _ := utils.GenerateToken(user.ID, user.Email)
		refreshToken, _ := utils.GenerateRefreshToken(user.ID, user.Email)

		c.JSON(http.StatusCreated, gin.H{
			"token":         token,
			"refresh_token": refreshToken,
			"user":          user,
		})
	}
}

func RefreshToken(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			RefreshToken string `json:"refresh_token" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		claims, err := utils.ValidateRefreshToken(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
			return
		}

		var user models.User
		if err := db.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		token, err := utils.GenerateToken(user.ID, user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		refreshToken, err := utils.GenerateRefreshToken(user.ID, user.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":         token,
			"refresh_token": refreshToken,
		})
	}
}

func GetCurrentUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
			return
		}

		var user models.User
		if err := db.First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		rbacService := services.NewRBACService(db)
		permissions, _ := rbacService.GetUserPermissions(user.ID)
		roles, _ := rbacService.GetUserRoles(user.ID)

		c.JSON(http.StatusOK, gin.H{
			"user":        user,
			"permissions": permissions,
			"roles":       roles,
		})
	}
}

func Logout(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

func ChangePassword(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("userID")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		var req struct {
			CurrentPassword string `json:"current_password" binding:"required"`
			NewPassword     string `json:"new_password" binding:"required,min=6"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		var user models.User
		if err := db.First(&user, "id = ?", userID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		if !utils.CheckPassword(req.CurrentPassword, user.PasswordHash) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect"})
			return
		}

		hashedPassword, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		user.PasswordHash = hashedPassword
		if err := db.Save(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
	}
}
