import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      loadCurrentUser()
    } else {
      setLoading(false)
    }
  }, [])

  const loadCurrentUser = () => {
    authService.getCurrentUser()
      .then((res) => {
        const data = res.data
        setUser(data.user || data)
        setPermissions(data.permissions || [])
        setRoles(data.roles || [])
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        setUser(null)
        setPermissions([])
        setRoles([])
      })
      .finally(() => setLoading(false))
  }

  const hasPermission = (permission) => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(p => permissions.includes(p))
  }

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(p => permissions.includes(p))
  }

  const hasRole = (roleName) => {
    return roles.some(r => 
      (typeof r === 'string' ? r : r.name) === roleName
    )
  }

  const hasAnyRole = (roleList) => {
    return roleList.some(r => roles.some(ur => ur.name === r))
  }

  const isAdmin = () => {
    return hasRole('ADMIN')
  }

  const login = async (email, password) => {
    const res = await authService.login({ email, password })
    const data = res.data
    
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refresh_token)
    
    setUser(data.user)
    setPermissions(data.permissions || [])
    setRoles(data.roles || [])
    
    return data
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setPermissions([])
    setRoles([])
  }

  const refreshAuth = () => {
    loadCurrentUser()
  }

  const value = {
    user,
    setUser,
    permissions,
    roles,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    login,
    logout,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Products - granular CRUD
  VIEW_PRODUCTS: 'view_products',
  CREATE_PRODUCTS: 'create_products',
  UPDATE_PRODUCTS: 'update_products',
  DELETE_PRODUCTS: 'delete_products',
  
  // Inventory - granular CRUD
  VIEW_INVENTORY: 'view_inventory',
  CREATE_INVENTORY: 'create_inventory',
  UPDATE_INVENTORY: 'update_inventory',
  DELETE_INVENTORY: 'delete_inventory',
  
  // Orders - granular CRUD
  VIEW_ORDERS: 'view_orders',
  CREATE_ORDERS: 'create_orders',
  UPDATE_ORDERS: 'update_orders',
  DELETE_ORDERS: 'delete_orders',
  APPROVE_ORDERS: 'approve_orders',
  
  // Suppliers - granular CRUD
  VIEW_SUPPLIERS: 'view_suppliers',
  CREATE_SUPPLIERS: 'create_suppliers',
  UPDATE_SUPPLIERS: 'update_suppliers',
  DELETE_SUPPLIERS: 'delete_suppliers',
  
  // Warehouses - granular CRUD
  VIEW_WAREHOUSES: 'view_warehouses',
  CREATE_WAREHOUSES: 'create_warehouses',
  UPDATE_WAREHOUSES: 'update_warehouses',
  DELETE_WAREHOUSES: 'delete_warehouses',
  
  // Users - granular CRUD
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  UPDATE_USERS: 'update_users',
  DELETE_USERS: 'delete_users',
  
  // Roles - granular CRUD
  VIEW_ROLES: 'view_roles',
  CREATE_ROLES: 'create_roles',
  UPDATE_ROLES: 'update_roles',
  DELETE_ROLES: 'delete_roles',
  MANAGE_PERMISSIONS: 'manage_permissions',
  
  // Reports & Data
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  
  // Notifications
  MANAGE_NOTIFICATIONS: 'manage_notifications',
}

export const PERMISSION_GROUPS = {
  dashboard: {
    label: 'Dashboard',
    permissions: ['view_dashboard'],
  },
  products: {
    label: 'Products',
    permissions: ['view_products', 'create_products', 'update_products', 'delete_products'],
  },
  inventory: {
    label: 'Inventory',
    permissions: ['view_inventory', 'create_inventory', 'update_inventory', 'delete_inventory'],
  },
  orders: {
    label: 'Orders',
    permissions: ['view_orders', 'create_orders', 'update_orders', 'delete_orders', 'approve_orders'],
  },
  suppliers: {
    label: 'Suppliers',
    permissions: ['view_suppliers', 'create_suppliers', 'update_suppliers', 'delete_suppliers'],
  },
  warehouses: {
    label: 'Warehouses',
    permissions: ['view_warehouses', 'create_warehouses', 'update_warehouses', 'delete_warehouses'],
  },
  users: {
    label: 'Users',
    permissions: ['view_users', 'create_users', 'update_users', 'delete_users'],
  },
  roles: {
    label: 'Roles & Permissions',
    permissions: ['view_roles', 'create_roles', 'update_roles', 'delete_roles', 'manage_permissions'],
  },
  data: {
    label: 'Data & Reports',
    permissions: ['view_reports', 'export_data'],
  },
  notifications: {
    label: 'Notifications',
    permissions: ['manage_notifications'],
  },
}
