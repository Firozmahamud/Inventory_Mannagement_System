import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { categoryService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit, Trash2, FolderTree, X, Search } from 'lucide-react'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

export default function Categories() {
  const { hasPermission, hasRole } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  })
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const canViewCategories = hasRole('ADMIN') || hasPermission('view_products')
  const canCreateCategories = hasRole('ADMIN') || hasPermission('create_products')
  const canUpdateCategories = hasRole('ADMIN') || hasPermission('update_products')
  const canDeleteCategories = hasRole('ADMIN') || hasPermission('delete_products')

  useEffect(() => {
    if (canViewCategories) {
      fetchCategories()
    }
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getAll()
      const cats = res.data.data || res.data || []
      setCategories(cats)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || formData.name.trim().length < 2) {
      showErrorSimple('Category name must be at least 2 characters')
      return
    }

    try {
      const data = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        is_active: formData.is_active
      }

      if (editing) {
        const res = await categoryService.update(editing.id, data)
        const updatedCategory = res.data.data || res.data
        setCategories(categories.map(c => c.id === editing.id ? { ...c, ...updatedCategory } : c))
        showSuccessSimple('Category updated successfully!')
      } else {
        const res = await categoryService.create(data)
        const newCategory = res.data.data || res.data
        setCategories([newCategory, ...categories])
        showSuccessSimple('Category created successfully!')
      }
      closeModal()
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to save category'
      showErrorSimple(message)
    }
  }

  const handleDelete = async (category) => {
    const confirmed = await showDeleteConfirm(category.name)
    if (!confirmed) return
    
    try {
      await categoryService.delete(category.id)
      setCategories(categories.filter(c => c.id !== category.id))
      showSuccessSimple('Category deleted successfully!')
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete category'
      showErrorSimple(message)
    }
  }

  const openModal = (category = null) => {
    if (category) {
      setEditing(category)
      setFormData({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active !== false
      })
    } else {
      setEditing(null)
      setFormData({ name: '', description: '', is_active: true })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setFormData({ name: '', description: '', is_active: true })
  }

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage)
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const isAdmin = hasRole('ADMIN')

  const columns = [
    {
      key: 'name',
      header: 'Category',
      accessor: 'name',
      align: 'left',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <FolderTree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      accessor: 'description',
      align: 'left',
      render: (_, row) => (
        <span style={{ color: 'var(--muted-foreground)' }}>
          {row.description || '-'}
        </span>
      ),
    },
    {
      key: 'product_count',
      header: 'Products',
      accessor: 'product_count',
      align: 'center',
      render: (_, row) => (
        <Badge variant="secondary">{row.product_count ?? 0}</Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      accessor: 'is_active',
      align: 'center',
      render: (_, row) => (
        <Badge variant={row.is_active ? 'success' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    ...(isAdmin ? [{
      key: 'created_info',
      header: 'Created By',
      accessor: 'id',
      align: 'left',
      render: (_, row) => (
        <div className="text-xs text-left">
          <div className="font-medium">{row.creator ? `${row.creator.first_name} ${row.creator.last_name}` : '-'}</div>
          <div style={{ color: 'var(--muted-foreground)' }}>{formatDateTime(row.created_at)}</div>
        </div>
      )
    }, {
      key: 'updated_info',
      header: 'Updated By',
      accessor: 'id',
      align: 'left',
      render: (_, row) => (
        <div className="text-xs text-left">
          <div className="font-medium">{row.updater ? `${row.updater.first_name} ${row.updater.last_name}` : '-'}</div>
          <div style={{ color: 'var(--muted-foreground)' }}>{formatDateTime(row.updated_at)}</div>
        </div>
      )
    }] : []),
    {
      key: 'actions',
      header: 'Actions',
      accessor: 'id',
      noDrag: true,
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {canUpdateCategories && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => openModal(row)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeleteCategories && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDelete(row)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (!canViewCategories) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FolderTree className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>You don't have permission to view categories.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage product categories</p>
        </div>
        {canCreateCategories && (
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        )}
      </div>

      <DataTable 
        columns={columns} 
        data={paginatedCategories} 
        loading={loading} 
        currentPage={currentPage} 
        totalPages={totalPages} 
        totalItems={filteredCategories.length} 
        itemsPerPage={itemsPerPage} 
        onPageChange={handlePageChange}
        storageKey="categories"
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? 'Edit Category' : 'Add Category'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Electronics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Category description (optional)"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is_active"
                    checked={formData.is_active} 
                    onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <Label htmlFor="is_active" className="!mt-0 cursor-pointer">Active Category</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
