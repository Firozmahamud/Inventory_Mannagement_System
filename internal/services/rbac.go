package services

import (
	"inventory-system/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RBACService struct {
	db *gorm.DB
}

func NewRBACService(db *gorm.DB) *RBACService {
	return &RBACService{db: db}
}

func (s *RBACService) GetUserPermissions(userID uuid.UUID) ([]string, error) {
	var permissions []string

	err := s.db.Table("permissions").
		Select("permissions.name").
		Joins("JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Joins("JOIN user_roles ON role_permissions.role_id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Where("permissions.name IS NOT NULL").
		Distinct().
		Pluck("permissions.name", &permissions).Error

	if err != nil {
		return nil, err
	}

	return permissions, nil
}

func (s *RBACService) GetUserRoles(userID uuid.UUID) ([]models.Role, error) {
	var roles []models.Role

	err := s.db.Table("roles").
		Select("roles.*").
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Find(&roles).Error

	if err != nil {
		return nil, err
	}

	return roles, nil
}

func (s *RBACService) GetRolePermissions(roleID uuid.UUID) ([]models.Permission, error) {
	var permissions []models.Permission

	err := s.db.Table("permissions").
		Select("permissions.*").
		Joins("JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ?", roleID).
		Find(&permissions).Error

	if err != nil {
		return nil, err
	}

	return permissions, nil
}

func (s *RBACService) AssignPermissionsToRole(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, permID := range permissionIDs {
		rp := models.RolePermission{
			RoleID:       roleID,
			PermissionID: permID,
		}

		var existing models.RolePermission
		result := tx.Where("role_id = ? AND permission_id = ?", roleID, permID).First(&existing)

		if result.RowsAffected == 0 {
			if err := tx.Create(&rp).Error; err != nil {
				tx.Rollback()
				return err
			}
		}
	}

	return tx.Commit().Error
}

func (s *RBACService) SetRolePermissions(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Where("role_id = ?", roleID).Delete(&models.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	for _, permID := range permissionIDs {
		rp := models.RolePermission{
			RoleID:       roleID,
			PermissionID: permID,
		}
		if err := tx.Create(&rp).Error; err != nil {
			tx.Rollback()
			return err
		}
	}

	return tx.Commit().Error
}

func (s *RBACService) RemovePermissionsFromRole(roleID uuid.UUID, permissionIDs []uuid.UUID) error {
	return s.db.Where("role_id = ? AND permission_id IN ?", roleID, permissionIDs).
		Delete(&models.RolePermission{}).Error
}

func (s *RBACService) IsRoleProtected(roleID uuid.UUID) (bool, error) {
	var role models.Role
	if err := s.db.First(&role, roleID).Error; err != nil {
		return false, err
	}

	protectedRoles := []string{"ADMIN"}
	for _, protected := range protectedRoles {
		if role.Name == protected {
			return true, nil
		}
	}

	return false, nil
}

func (s *RBACService) GetRoleUserCount(roleID uuid.UUID) (int64, error) {
	var count int64
	err := s.db.Model(&models.UserRole{}).Where("role_id = ?", roleID).Count(&count).Error
	return count, err
}

func (s *RBACService) ReassignUsersToRole(fromRoleID uuid.UUID, toRoleID uuid.UUID) error {
	return s.db.Model(&models.UserRole{}).
		Where("role_id = ?", fromRoleID).
		Update("role_id", toRoleID).Error
}

func (s *RBACService) UnassignAllRolesFromUser(userID uuid.UUID) error {
	return s.db.Where("user_id = ?", userID).Delete(&models.UserRole{}).Error
}

func (s *RBACService) HasPermission(userID uuid.UUID, permissionName string) (bool, error) {
	var count int64
	err := s.db.Table("permissions").
		Select("COUNT(*)").
		Joins("JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Joins("JOIN user_roles ON role_permissions.role_id = user_roles.role_id").
		Where("user_roles.user_id = ?", userID).
		Where("permissions.name = ?", permissionName).
		Count(&count).Error

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (s *RBACService) CopyRolePermissions(fromRoleID, toRoleID uuid.UUID) error {
	var permissions []models.Permission

	err := s.db.Table("permissions").
		Select("permissions.*").
		Joins("JOIN role_permissions ON permissions.id = role_permissions.permission_id").
		Where("role_permissions.role_id = ?", fromRoleID).
		Find(&permissions).Error

	if err != nil {
		return err
	}

	for _, perm := range permissions {
		rp := models.RolePermission{
			RoleID:       toRoleID,
			PermissionID: perm.ID,
		}

		var existing models.RolePermission
		result := s.db.Where("role_id = ? AND permission_id = ?", toRoleID, perm.ID).First(&existing)

		if result.RowsAffected == 0 {
			if err := s.db.Create(&rp).Error; err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *RBACService) GetDefaultRole() (*models.Role, error) {
	var role models.Role
	err := s.db.Where("name = ?", "VIEWER").First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}
