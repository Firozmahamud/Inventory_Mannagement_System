package handlers

import (
	"log"
	"net/http"
	"regexp"
	"strconv"

	"inventory-system/internal/models"
	"inventory-system/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var roleNameRegex = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

func ListRoles(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var roles []models.Role
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
		offset := (page - 1) * limit

		var total int64
		db.Model(&models.Role{}).Count(&total)

		if err := db.Order("created_at DESC").Offset(offset).Limit(limit).Find(&roles).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		rbacService := services.NewRBACService(db)
		type RoleWithCount struct {
			models.Role
			UserCount int64 `json:"user_count"`
		}
		rolesWithCount := make([]RoleWithCount, len(roles))
		for i, role := range roles {
			count, _ := rbacService.GetRoleUserCount(role.ID)
			rolesWithCount[i] = RoleWithCount{
				Role:      role,
				UserCount: count,
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"data":       rolesWithCount,
			"total":      total,
			"page":       page,
			"limit":      limit,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		})
	}
}

func GetRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
			return
		}

		var role models.Role
		if err := db.First(&role, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
			return
		}

		rbacService := services.NewRBACService(db)
		permissions, _ := rbacService.GetRolePermissions(uid)
		userCount, _ := rbacService.GetRoleUserCount(uid)

		c.JSON(http.StatusOK, gin.H{
			"role":        role,
			"permissions": permissions,
			"user_count":  userCount,
		})
	}
}

func CreateRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Name           string   `json:"name" binding:"required"`
			Description    string   `json:"description"`
			PermissionIDs  []string `json:"permission_ids"`
			CopyFromRoleID string   `json:"copy_from_role_id"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(input.Name) < 3 || len(input.Name) > 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role name must be between 3 and 50 characters"})
			return
		}

		if !roleNameRegex.MatchString(input.Name) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Role name can only contain letters, numbers, and underscores"})
			return
		}

		var existing models.Role
		if err := db.Where("name = ?", input.Name).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Role with this name already exists"})
			return
		}

		role := models.Role{
			Name:        input.Name,
			Description: input.Description,
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		if err := tx.Create(&role).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
			return
		}

		rbacService := services.NewRBACService(tx)

		if input.CopyFromRoleID != "" {
			copyFromUID, err := uuid.Parse(input.CopyFromRoleID)
			if err == nil {
				if err := rbacService.CopyRolePermissions(copyFromUID, role.ID); err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy permissions from role"})
					return
				}
			}
		} else if len(input.PermissionIDs) > 0 {
			for _, pidStr := range input.PermissionIDs {
				pid, err := uuid.Parse(pidStr)
				if err != nil {
					continue
				}
				rp := models.RolePermission{
					RoleID:       role.ID,
					PermissionID: pid,
				}
				tx.Create(&rp)
			}
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
			return
		}

		db.Preload("Permissions.Permission").First(&role, role.ID)

		c.JSON(http.StatusCreated, role)
	}
}

func UpdateRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
			return
		}

		var role models.Role
		if err := db.First(&role, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
			return
		}

		if role.Name == "ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify the ADMIN role name"})
			return
		}

		var input struct {
			Name          string   `json:"name"`
			Description   string   `json:"description"`
			PermissionIDs []string `json:"permission_ids"`
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

		if input.Name != "" {
			if len(input.Name) < 3 || len(input.Name) > 50 {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Role name must be between 3 and 50 characters"})
				return
			}

			if !roleNameRegex.MatchString(input.Name) {
				tx.Rollback()
				c.JSON(http.StatusBadRequest, gin.H{"error": "Role name can only contain letters, numbers, and underscores"})
				return
			}

			var existing models.Role
			if err := tx.Where("name = ? AND id != ?", input.Name, uid).First(&existing).Error; err == nil {
				tx.Rollback()
				c.JSON(http.StatusConflict, gin.H{"error": "Role with this name already exists"})
				return
			}

			role.Name = input.Name
		}

		if input.Description != "" {
			role.Description = input.Description
		}

		if err := tx.Save(&role).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
			return
		}

		if input.PermissionIDs != nil {
			if err := tx.Where("role_id = ?", uid).Delete(&models.RolePermission{}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update permissions"})
				return
			}

			for _, pidStr := range input.PermissionIDs {
				pid, err := uuid.Parse(pidStr)
				if err != nil {
					continue
				}
				rp := models.RolePermission{
					RoleID:       uid,
					PermissionID: pid,
				}
				tx.Create(&rp)
			}
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
			return
		}

		db.Preload("Permissions.Permission").First(&role, role.ID)

		c.JSON(http.StatusOK, role)
	}
}

func DeleteRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
			return
		}

		var role models.Role
		if err := db.First(&role, uid).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
			return
		}

		rbacService := services.NewRBACService(db)

		isProtected, _ := rbacService.IsRoleProtected(uid)
		if isProtected {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete protected role: " + role.Name})
			return
		}

		tx := db.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		defaultRole, err := rbacService.GetDefaultRole()
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Default role (VIEWER) not found"})
			return
		}

		if err := tx.Model(&models.UserRole{}).
			Where("role_id = ?", uid).
			Update("role_id", defaultRole.ID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reassign users"})
			return
		}

		if err := tx.Where("role_id = ?", uid).Delete(&models.RolePermission{}).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role permissions"})
			return
		}

		if err := tx.Delete(&role).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
			return
		}

		if err := tx.Commit().Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":       "Role deleted successfully",
			"reassigned_to": defaultRole.Name,
		})
	}
}

func ListPermissions(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var permissions []models.Permission
		if err := db.Find(&permissions).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, permissions)
	}
}

func AssignPermissionsToRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		roleUID, err := uuid.Parse(id)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
			return
		}

		var role models.Role
		if err := db.First(&role, roleUID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
			return
		}

		var input struct {
			PermissionIDs []string `json:"permission_ids" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(input.PermissionIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "At least one permission ID is required"})
			return
		}

		var permissionIDs []uuid.UUID
		for _, pidStr := range input.PermissionIDs {
			pid, err := uuid.Parse(pidStr)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission ID: " + pidStr})
				return
			}

			var perm models.Permission
			if err := db.First(&perm, pid).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Permission not found: " + pidStr})
				return
			}
			permissionIDs = append(permissionIDs, pid)
		}

		rbacService := services.NewRBACService(db)
		if err := rbacService.SetRolePermissions(roleUID, permissionIDs); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign permissions"})
			return
		}

		permissions, _ := rbacService.GetRolePermissions(roleUID)

		c.JSON(http.StatusOK, gin.H{
			"message":     "Permissions assigned successfully",
			"role":        role,
			"permissions": permissions,
		})
	}
}

func GetUserRoles(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("userId")
		uid, err := uuid.Parse(userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		rbacService := services.NewRBACService(db)
		roles, err := rbacService.GetUserRoles(uid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, roles)
	}
}

func AssignRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			UserID string `json:"user_id" binding:"required"`
			RoleID string `json:"role_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userUID, err := uuid.Parse(input.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		roleUID, err := uuid.Parse(input.RoleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
			return
		}

		var user models.User
		if err := db.First(&user, userUID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		var role models.Role
		if err := db.First(&role, roleUID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
			return
		}

		var existing models.UserRole
		result := db.Where("user_id = ? AND role_id = ?", userUID, roleUID).First(&existing)
		if result.RowsAffected > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "User already has this role"})
			return
		}

		userRole := models.UserRole{
			UserID: userUID,
			RoleID: roleUID,
		}

		if err := db.Create(&userRole).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign role"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":   "Role assigned successfully",
			"user_role": userRole,
		})
	}
}

func RemoveRole(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			UserID string `json:"user_id" binding:"required"`
			RoleID string `json:"role_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userUID, err := uuid.Parse(input.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		roleUID, err := uuid.Parse(input.RoleID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role ID"})
			return
		}

		rbacService := services.NewRBACService(db)
		userRoles, _ := rbacService.GetUserRoles(userUID)
		if len(userRoles) <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the last role from a user"})
			return
		}

		if err := db.Where("user_id = ? AND role_id = ?", userUID, roleUID).Delete(&models.UserRole{}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove role"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Role removed successfully"})
	}
}

func UpdateUserRoles(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.Param("id")
		userUID, err := uuid.Parse(userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}

		var user models.User
		if err := db.First(&user, userUID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		var input struct {
			RoleIDs []string `json:"role_ids" binding:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if len(input.RoleIDs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User must have at least one role"})
			return
		}

		log.Printf("[DEBUG] UpdateUserRoles received role_ids: %v", input.RoleIDs)

		err = db.Transaction(func(tx *gorm.DB) error {
			deleteResult := tx.Where("user_id = ?", userUID).Delete(&models.UserRole{})
			if deleteResult.Error != nil {
				log.Printf("[DEBUG] Delete error: %v", deleteResult.Error)
				return deleteResult.Error
			}
			log.Printf("[DEBUG] Deleted %d existing user_roles", deleteResult.RowsAffected)

			for _, roleIDStr := range input.RoleIDs {
				roleUID, err := uuid.Parse(roleIDStr)
				if err != nil {
					log.Printf("[DEBUG] Invalid role UUID '%s': %v", roleIDStr, err)
					continue
				}

				var role models.Role
				if err := tx.First(&role, roleUID).Error; err != nil {
					log.Printf("[DEBUG] Role not found with id '%s': %v", roleIDStr, err)
					continue
				}
				log.Printf("[DEBUG] Found role: %s (name: %s)", roleUID, role.Name)

				userRole := models.UserRole{
					UserID: userUID,
					RoleID: roleUID,
				}
				if err := tx.Create(&userRole).Error; err != nil {
					log.Printf("[DEBUG] Create user_role error: %v", err)
					return err
				}
				log.Printf("[DEBUG] Created user_role for user %s, role %s", userUID, roleUID)
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user roles: " + err.Error()})
			return
		}

		var roles []models.Role
		err = db.Table("roles").
			Select("roles.*").
			Joins("JOIN user_roles ON roles.id = user_roles.role_id").
			Where("user_roles.user_id = ?", userUID).
			Find(&roles).Error

		if err != nil {
			roles = []models.Role{}
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "User roles updated successfully",
			"roles":   roles,
		})
	}
}
