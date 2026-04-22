package middleware

import (
	"net/http"
	"strings"

	"inventory-system/internal/services"
	"inventory-system/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var db *gorm.DB

func InitMiddleware(database *gorm.DB) {
	db = database
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]
		claims, err := utils.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID.String())
		c.Set("email", claims.Email)
		c.Next()
	}
}

func PermissionMiddleware(requiredPermission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("userID")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
			c.Abort()
			return
		}

		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
			c.Abort()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}

		rbacService := services.NewRBACService(db)

		userRoles, err := rbacService.GetUserRoles(userID)
		if err == nil {
			for _, role := range userRoles {
				if role.Name == "ADMIN" {
					c.Next()
					return
				}
			}
		}

		hasPermission, err := rbacService.HasPermission(userID, requiredPermission)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
			c.Abort()
			return
		}

		if !hasPermission {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied: " + requiredPermission})
			c.Abort()
			return
		}

		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("userID")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
			c.Abort()
			return
		}

		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
			c.Abort()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}

		rbacService := services.NewRBACService(db)
		roles, err := rbacService.GetUserRoles(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check roles"})
			c.Abort()
			return
		}

		roleNames := make(map[string]bool)
		for _, role := range roles {
			roleNames[role.Name] = true
		}

		for _, allowed := range allowedRoles {
			if roleNames[allowed] {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: insufficient role privileges"})
		c.Abort()
	}
}

func AnyPermissionMiddleware(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("userID")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
			c.Abort()
			return
		}

		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
			c.Abort()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}

		rbacService := services.NewRBACService(db)
		userPermissions, err := rbacService.GetUserPermissions(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
			c.Abort()
			return
		}

		permMap := make(map[string]bool)
		for _, p := range userPermissions {
			permMap[p] = true
		}

		for _, required := range requiredPermissions {
			if permMap[required] {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied: requires one of " + strings.Join(requiredPermissions, ", ")})
		c.Abort()
	}
}

func AllPermissionsMiddleware(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("userID")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
			c.Abort()
			return
		}

		if db == nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
			c.Abort()
			return
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}

		rbacService := services.NewRBACService(db)
		userPermissions, err := rbacService.GetUserPermissions(userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check permissions"})
			c.Abort()
			return
		}

		permMap := make(map[string]bool)
		for _, p := range userPermissions {
			permMap[p] = true
		}

		for _, required := range requiredPermissions {
			if !permMap[required] {
				c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied: missing " + required})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}
