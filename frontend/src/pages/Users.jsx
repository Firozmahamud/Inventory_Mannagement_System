import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, PasswordInput, Label } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { userService, roleService, userRoleService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit, Trash2, UserCog, X, Check, Shield, Camera, Upload } from 'lucide-react'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar) return avatar
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3b82f6&color=fff&size=128&font-size=0.4&bold=true`
}

export default function Users() {
  const { hasPermission, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [userRoles, setUserRoles] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRolesModal, setShowRolesModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserRoles, setSelectedUserRoles] = useState([])
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    first_name: '', 
    last_name: '', 
    phone: '', 
    is_active: true,
    avatar: '' 
  })
  const [formRoles, setFormRoles] = useState([])
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => { 
    fetchUsers() 
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll()
      setUsers(res.data.data || [])
      
      const rolesMap = {}
      for (const user of res.data.data || []) {
        try {
          const rolesRes = await userRoleService.getByUser(user.id)
          rolesMap[user.id] = rolesRes.data || []
        } catch (e) {
          rolesMap[user.id] = []
        }
      }
      setUserRoles(rolesMap)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await roleService.getAll()
      setRoles(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showErrorSimple('Image size must be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result
        setAvatarPreview(base64)
        setFormData(prev => ({ ...prev, avatar: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    setAvatarPreview(null)
    setFormData(prev => ({ ...prev, avatar: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formRoles.length === 0) {
      showErrorSimple('Please select at least one role')
      return
    }

    try {
      let newUser
      if (editing) {
        const { password, email, ...updateData } = formData
        const res = await userService.update(editing.id, updateData)
        newUser = res.data.data || res.data
        await userService.updateRoles(editing.id, formRoles)
        showSuccessSimple('User updated successfully!')
      } else {
        const newUserRes = await userService.create(formData)
        newUser = newUserRes.data.data || newUserRes.data
        await userService.updateRoles(newUser.id, formRoles)
        showSuccessSimple('User created successfully!')
      }
      closeModal()
      fetchUsers()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save user'
      showErrorSimple(message)
    }
  }

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      showErrorSimple('You cannot delete your own account')
      return
    }
    
    const confirmed = await showDeleteConfirm(`${user.first_name} ${user.last_name}`)
    if (!confirmed) return
    
    try {
      await userService.delete(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setUserRoles(prev => {
        const newRoles = { ...prev }
        delete newRoles[user.id]
        return newRoles
      })
      showSuccessSimple('User deleted successfully!')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete user'
      showErrorSimple(message)
    }
  }

  const openRolesModal = async (user) => {
    setSelectedUser(user)
    setSelectedUserRoles(userRoles[user.id]?.map(r => r.id) || [])
    setShowRolesModal(true)
  }

  const toggleUserRole = (roleId) => {
    setSelectedUserRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const toggleFormRole = (roleId) => {
    setFormRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const saveUserRoles = async () => {
    if (selectedUserRoles.length === 0) {
      showErrorSimple('User must have at least one role')
      return
    }

    try {
      await userService.updateRoles(selectedUser.id, selectedUserRoles)
      setShowRolesModal(false)
      fetchUsers()
      showSuccessSimple('User roles updated successfully!')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to update user roles'
      showErrorSimple(message)
    }
  }

  const openModal = (user = null) => {
    if (user) {
      setEditing(user)
      setAvatarPreview(user.avatar || null)
      setFormData({
        email: user.email,
        password: '',
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone || '',
        is_active: user.is_active,
        avatar: user.avatar || ''
      })
      setFormRoles(userRoles[user.id]?.map(r => r.id) || [])
    } else {
      setEditing(null)
      setAvatarPreview(null)
      setFormData({ email: '', password: '', first_name: '', last_name: '', phone: '', is_active: true, avatar: '' })
      setFormRoles([])
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setAvatarPreview(null)
    setFormData({ email: '', password: '', first_name: '', last_name: '', phone: '', is_active: true, avatar: '' })
    setFormRoles([])
  }

  const canViewUsers = hasPermission('view_users')
  const canCreateUsers = hasPermission('create_users')
  const canUpdateUsers = hasPermission('update_users')
  const canDeleteUsers = hasPermission('delete_users')

  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase()
    return (
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    )
  })

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }

  const columns = [
    {
      key: 'user',
      header: 'User',
      accessor: 'first_name',
      align: 'left',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <img 
            src={getAvatarUrl(row.avatar, row.first_name, row.last_name)} 
            alt={`${row.first_name} ${row.last_name}`}
            className="h-10 w-10 rounded-full object-cover bg-gray-200 dark:bg-slate-700 flex-shrink-0"
          />
          <div className="text-left">
            <div className="font-medium">{row.first_name} {row.last_name}</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: 'phone',
      align: 'left',
      render: (val) => val || 'N/A'
    },
    {
      key: 'roles',
      header: 'Roles',
      accessor: 'id',
      align: 'left',
      render: (_, row) => {
        const userRolesList = userRoles[row.id] || []
        if (userRolesList.length === 0) {
          return <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No roles</span>
        }
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {userRolesList.map(role => (
              <span 
                key={role.id} 
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                <Shield className="h-3 w-3 mr-1" />
                {role.name}
              </span>
            ))}
          </div>
        )
      }
    },
    {
      key: 'is_active',
      header: 'Status',
      accessor: 'is_active',
      align: 'center',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          val 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: 'id',
      noDrag: true,
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {canUpdateUsers && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => openModal(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canUpdateUsers && (
            <button
              onClick={() => openRolesModal(row)}
              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
              title="Manage roles"
            >
              <UserCog className="h-4 w-4" />
            </button>
          )}
          {canDeleteUsers && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDelete(row)}
              disabled={row.id === currentUser?.id}
              title={row.id === currentUser?.id ? "Cannot delete your own account" : "Delete user"}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      )
    }
  ]

  if (!canViewUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>You don't have permission to view users.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage system users and their roles</p>
        </div>
        {canCreateUsers && (
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        )}
      </div>

      <DataTable 
        columns={columns} 
        data={paginatedUsers} 
        loading={loading} 
        currentPage={currentPage} 
        totalPages={totalPages} 
        totalItems={filteredUsers.length} 
        itemsPerPage={itemsPerPage} 
        onPageChange={handlePageChange} 
        storageKey="users" 
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? 'Edit User' : 'Add User'}</CardTitle>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={closeModal}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <img 
                      src={avatarPreview || getAvatarUrl(editing?.avatar, editing?.first_name, editing?.last_name)} 
                      alt="Avatar Preview"
                      className="h-24 w-24 rounded-full object-cover bg-gray-200 dark:bg-slate-700"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div className="absolute bottom-0 right-0 flex gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 w-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                        title="Upload photo"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                      {(avatarPreview || editing?.avatar) && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                          title="Remove photo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input 
                      value={formData.first_name} 
                      onChange={e => setFormData({...formData, first_name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input 
                      value={formData.last_name} 
                      onChange={e => setFormData({...formData, last_name: e.target.value})} 
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password {!editing && '*'}</Label>
                  <PasswordInput
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editing}
                    placeholder={editing ? 'Leave blank to keep current' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Roles *</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-background">
                    {roles.map(role => (
                      <label
                        key={role.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formRoles.includes(role.id)}
                          onChange={() => toggleFormRole(role.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{role.name}</span>
                            {role.name === 'ADMIN' && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">Protected</span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{role.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  {formRoles.length === 0 && (
                    <p className="text-xs text-red-500">Please select at least one role</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_active"
                    checked={formData.is_active} 
                    onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="is_active" className="!mt-0">Active</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button type="submit" disabled={formRoles.length === 0}>{editing ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showRolesModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Assign Roles</CardTitle>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowRolesModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.map(role => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserRoles.includes(role.id)}
                    onChange={() => toggleUserRole(role.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {role.name === 'ADMIN' && (
                        <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">Protected</span>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{role.description}</p>
                    )}
                  </div>
                </label>
              ))}
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowRolesModal(false)}>Cancel</Button>
                <Button onClick={saveUserRoles} disabled={selectedUserRoles.length === 0}>
                  <Check className="h-4 w-4 mr-2" /> Save Roles
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
