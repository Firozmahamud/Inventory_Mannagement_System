import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { roleService, permissionService } from '../services/api'
import { useAuth, PERMISSION_GROUPS, PERMISSIONS } from '../context/AuthContext'
import { Plus, Edit, Trash2, Shield, Users, Check, X, ChevronDown, ChevronRight } from 'lucide-react'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

const PERMISSION_LABELS = {
  // Dashboard
  'view_dashboard': 'View Dashboard',
  'view_reports': 'View Reports',
  
  // Products - granular
  'view_products': 'View Products',
  'create_products': 'Create Products',
  'update_products': 'Update Products',
  'delete_products': 'Delete Products',
  
  // Inventory - granular
  'view_inventory': 'View Inventory',
  'create_inventory': 'Create Inventory',
  'update_inventory': 'Update Inventory',
  'delete_inventory': 'Delete Inventory',
  
  // Orders - granular
  'view_orders': 'View Orders',
  'create_orders': 'Create Orders',
  'update_orders': 'Update Orders',
  'delete_orders': 'Delete Orders',
  'approve_orders': 'Approve Orders',
  
  // Suppliers - granular
  'view_suppliers': 'View Suppliers',
  'create_suppliers': 'Create Suppliers',
  'update_suppliers': 'Update Suppliers',
  'delete_suppliers': 'Delete Suppliers',
  
  // Warehouses - granular
  'view_warehouses': 'View Warehouses',
  'create_warehouses': 'Create Warehouses',
  'update_warehouses': 'Update Warehouses',
  'delete_warehouses': 'Delete Warehouses',
  
  // Users - granular
  'view_users': 'View Users',
  'create_users': 'Create Users',
  'update_users': 'Update Users',
  'delete_users': 'Delete Users',
  
  // Roles - granular
  'view_roles': 'View Roles',
  'create_roles': 'Create Roles',
  'update_roles': 'Update Roles',
  'delete_roles': 'Delete Roles',
  'manage_permissions': 'Manage Role Permissions',
  
  // Reports & Data
  'export_data': 'Export Data',
  'manage_notifications': 'Manage Notifications',
}

const PERMISSION_GROUP_ORDER = {
  dashboard: 1,
  products: 2,
  inventory: 3,
  orders: 4,
  suppliers: 5,
  warehouses: 6,
  users: 7,
  roles: 8,
  data: 9,
  notifications: 10,
}

export default function Roles() {
  const { hasPermission, hasRole } = useAuth()
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [rolePermissions, setRolePermissions] = useState([])
  const [expandedGroups, setExpandedGroups] = useState({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    copy_from_role_id: '',
  })
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await roleService.getAll()
      const sortedRoles = (res.data.data || []).sort((a, b) => {
        if (a.name === 'ADMIN') return -1
        if (b.name === 'ADMIN') return 1
        return a.name.localeCompare(b.name)
      })
      setRoles(sortedRoles)
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const res = await permissionService.getAll()
      setPermissions(res.data || [])
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }

  const fetchRolePermissions = async (roleId) => {
    try {
      const res = await roleService.getById(roleId)
      setRolePermissions(res.data.permissions || [])
      setSelectedPermissions(res.data.permissions?.map(p => p.id) || [])
    } catch (error) {
      console.error('Failed to fetch role permissions:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || formData.name.length < 3 || formData.name.length > 50) {
      showErrorSimple('Role name must be between 3 and 50 characters')
      return
    }

    try {
      const data = {
        name: formData.name.toUpperCase(),
        description: formData.description,
      }

      if (formData.copy_from_role_id && !editingRole) {
        data.copy_from_role_id = formData.copy_from_role_id
      }

      if (editingRole) {
        const res = await roleService.update(editingRole.id, data)
        const updatedRole = res.data.data || res.data
        setRoles(roles.map(r => r.id === editingRole.id ? { ...r, ...updatedRole } : r))
        showSuccessSimple('Role updated successfully!')
      } else {
        const res = await roleService.create(data)
        const newRole = res.data.data || res.data
        setRoles(prev => [...prev, newRole].sort((a, b) => {
          if (a.name === 'ADMIN') return -1
          if (b.name === 'ADMIN') return 1
          return a.name.localeCompare(b.name)
        }))
        showSuccessSimple('Role created successfully!')
      }
      
      closeModal()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save role'
      showErrorSimple(message)
    }
  }

  const handleDelete = async (role) => {
    const confirmed = await showDeleteConfirm(role.name)
    if (!confirmed) return
    
    try {
      await roleService.delete(role.id)
      setRoles(roles.filter(r => r.id !== role.id))
      showSuccessSimple('Role deleted successfully!')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete role'
      showErrorSimple(message)
    }
  }

  const openPermissionsModal = async (role) => {
    setSelectedRole(role)
    await fetchRolePermissions(role.id)
    setShowPermissionsModal(true)
    setExpandedGroups(Object.keys(PERMISSION_GROUPS).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
  }

  const togglePermission = (permId) => {
    setSelectedPermissions(prev => 
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    )
  }

  const savePermissions = async () => {
    try {
      await roleService.assignPermissions(selectedRole.id, selectedPermissions)
      setShowPermissionsModal(false)
      fetchRoles()
      showSuccessSimple('Permissions updated successfully!')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save permissions'
      showErrorSimple(message)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRole(null)
    setFormData({ name: '', description: '', copy_from_role_id: '' })
  }

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  const getPermissionsByGroup = () => {
    const grouped = {}
    Object.entries(PERMISSION_GROUPS).forEach(([groupKey, group]) => {
      const groupPermissions = permissions.filter(p => group.permissions.includes(p.name))
      if (groupPermissions.length > 0) {
        grouped[groupKey] = {
          label: group.label,
          order: PERMISSION_GROUP_ORDER[groupKey] || 99,
          permissions: groupPermissions
        }
      }
    })
    return Object.fromEntries(
      Object.entries(grouped).sort(([,a], [,b]) => a.order - b.order)
    )
  }

  const canViewRoles = hasRole('ADMIN') || hasPermission('view_roles')
  const canCreateRoles = hasRole('ADMIN') || hasPermission('create_roles')
  const canUpdateRoles = hasRole('ADMIN') || hasPermission('update_roles')
  const canDeleteRoles = hasRole('ADMIN') || hasPermission('delete_roles')
  const canManagePermissions = hasRole('ADMIN') || hasPermission('manage_permissions')
  const canManageRoles = canCreateRoles || canUpdateRoles || canDeleteRoles

  const totalPages = Math.ceil(roles.length / itemsPerPage)
  const paginatedRoles = roles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const columns = [
    {
      key: 'name',
      header: 'Role',
      accessor: 'name',
      align: 'left',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <span className="font-medium">{row.name}</span>
          {row.name === 'ADMIN' && (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded dark:bg-red-900/30 dark:text-red-400">Protected</span>
          )}
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      accessor: 'description',
      align: 'left',
      render: (_, row) => row.description || '-'
    },
    {
      key: 'user_count',
      header: 'Users',
      accessor: 'user_count',
      align: 'center',
      render: (_, row) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm dark:bg-slate-700">
          <Users className="h-3 w-3" />
          {row.user_count || 0}
        </span>
      )
    },
    ...(canManagePermissions ? [{
      key: 'permissions',
      header: 'Permissions',
      accessor: 'id',
      align: 'center',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => openPermissionsModal(row)}>
          Manage
        </Button>
      )
    }] : []),
    ...((canManagePermissions || canManageRoles) ? [{
      key: 'actions',
      header: 'Actions',
      accessor: 'id',
      noDrag: true,
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {canUpdateRoles && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { 
                setEditingRole(row)
                setFormData({ name: row.name, description: row.description || '', copy_from_role_id: '' })
                setShowModal(true)
              }}
              disabled={row.name === 'ADMIN'}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeleteRoles && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDelete(row)}
              disabled={row.name === 'ADMIN' || (row.user_count || 0) > 0}
              title={row.name === 'ADMIN' ? 'Cannot delete protected role' : (row.user_count || 0) > 0 ? 'Reassign users first' : 'Delete role'}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      )
    }] : [])
  ]

  if (!canViewRoles) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>You don't have permission to view roles.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage system roles and permissions</p>
        </div>
        {canCreateRoles && (
          <Button onClick={() => { setEditingRole(null); setShowModal(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Role
          </Button>
        )}
      </div>

      <DataTable 
        columns={columns} 
        data={paginatedRoles} 
        loading={loading} 
        currentPage={currentPage} 
        totalPages={totalPages} 
        totalItems={roles.length} 
        itemsPerPage={itemsPerPage} 
        onPageChange={handlePageChange} 
        storageKey="roles" 
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Role Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., MANAGER"
                    required
                    disabled={editingRole?.name === 'ADMIN'}
                  />
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>3-50 characters, letters, numbers, and underscores only</p>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Role description"
                  />
                </div>
                {!editingRole && (
                  <div className="space-y-2">
                    <Label>Copy Permissions From</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white dark:border-slate-600"
                      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                      value={formData.copy_from_role_id}
                      onChange={e => setFormData({...formData, copy_from_role_id: e.target.value})}
                    >
                      <option value="">Start with no permissions</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Optionally copy permissions from an existing role</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button type="submit">{editingRole ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showPermissionsModal && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 border-b">
              <div>
                <CardTitle>Permissions for {selectedRole.name}</CardTitle>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedPermissions.length} of {permissions.length} permissions assigned
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPermissionsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="divide-y">
                {Object.entries(getPermissionsByGroup()).map(([groupKey, group]) => {
                  const assignedInGroup = group.permissions.filter(p => selectedPermissions.includes(p.id)).length
                  const isAllSelected = assignedInGroup === group.permissions.length
                  
                  return (
                    <div key={groupKey} className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isAllSelected && group.permissions.length > 0}
                            ref={(el) => {
                              if (el) el.indeterminate = assignedInGroup > 0 && !isAllSelected
                            }}
                            onChange={() => {
                              if (isAllSelected) {
                                setSelectedPermissions(prev => prev.filter(id => !group.permissions.map(p => p.id).includes(id)))
                              } else {
                                const groupIds = group.permissions.map(p => p.id)
                                setSelectedPermissions(prev => [...new Set([...prev, ...groupIds])])
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span className="font-medium">{group.label}</span>
                          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            ({assignedInGroup}/{group.permissions.length})
                          </span>
                        </div>
                        <button onClick={() => toggleGroup(groupKey)}>
                          {expandedGroups[groupKey] ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {expandedGroups[groupKey] && (
                        <div className="px-4 py-2 space-y-2 dark:bg-slate-800/30">
                          {group.permissions.length > 0 ? (
                            group.permissions.map(perm => (
                              <label
                                key={perm.id}
                                className="flex items-center gap-3 py-1.5 px-2 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.id)}
                                  onChange={() => togglePermission(perm.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                />
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{PERMISSION_LABELS[perm.name] || perm.name}</span>
                                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{perm.description}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  perm.name.startsWith('view_') ? 'bg-blue-100 text-blue-700' :
                                  perm.name.startsWith('create_') ? 'bg-green-100 text-green-700' :
                                  perm.name.startsWith('update_') ? 'bg-yellow-100 text-yellow-700' :
                                  perm.name.startsWith('delete_') ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {perm.name.split('_')[0]}
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className="text-sm py-2 px-2" style={{ color: 'var(--muted-foreground)' }}>No permissions in this group</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
            <div className="p-4 border-t flex justify-between items-center dark:bg-slate-800/50">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPermissions(permissions.map(p => p.id))}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPermissions([])}
                >
                  Clear All
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>Cancel</Button>
                <Button onClick={savePermissions}>Save Permissions</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
