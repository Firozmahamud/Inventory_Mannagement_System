import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { supplierService } from '../services/api'
import { Plus, Edit, Trash2, Truck, X, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

export default function Suppliers() {
  const { hasPermission, hasRole } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ name: '', code: '', email: '', phone: '', address: '', city: '', country: '', contact_person: '', notes: '' })
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const canViewSuppliers = hasRole('ADMIN') || hasPermission('view_suppliers')
  const canCreateSuppliers = hasRole('ADMIN') || hasPermission('create_suppliers')
  const canUpdateSuppliers = hasRole('ADMIN') || hasPermission('update_suppliers')
  const canDeleteSuppliers = hasRole('ADMIN') || hasPermission('delete_suppliers')

  useEffect(() => { fetchSuppliers() }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await supplierService.getAll()
      setSuppliers(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { code, ...createData } = formData
    
    if (editing) {
      try {
        const res = await supplierService.update(editing.id, formData)
        const updatedSupplier = res.data.data || res.data
        setSuppliers(prev => prev.map(s => String(s.id) === String(editing.id) ? { ...s, ...updatedSupplier } : s))
        showSuccessSimple('Supplier updated successfully!')
      } catch (error) {
        console.error('Failed to update supplier:', error)
        showErrorSimple(error.response?.data?.error || 'Failed to update supplier')
      }
    } else {
      try {
        console.log('Creating supplier with data:', createData)
        const res = await supplierService.create(createData)
        console.log('Create response:', res)
        const newSupplier = res.data.data || res.data
        console.log('New supplier:', newSupplier)
        setSuppliers(prev => [newSupplier, ...prev])
        showSuccessSimple('Supplier created successfully!')
      } catch (error) {
        console.error('Failed to create supplier:', error)
        console.error('Error response:', error.response?.data)
        showErrorSimple(error.response?.data?.error || error.message || 'Failed to create supplier')
      }
    }
    setShowModal(false)
    setEditing(null)
    setFormData({ name: '', code: '', email: '', phone: '', address: '', city: '', country: '', contact_person: '', notes: '' })
  }

  const handleDelete = async (supplier) => {
    const confirmed = await showDeleteConfirm(supplier.name)
    if (!confirmed) return
    
    try {
      await supplierService.delete(supplier.id)
      setSuppliers(prev => prev.filter(s => s.id !== supplier.id))
      showSuccessSimple('Supplier deleted successfully!')
    } catch (error) {
      console.error('Failed to delete:', error)
      showErrorSimple(error.response?.data?.error || 'Failed to delete supplier')
    }
  }

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditing(supplier)
      setFormData({
        name: supplier.name || '',
        code: supplier.code || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        country: supplier.country || '',
        contact_person: supplier.contact_person || '',
        notes: supplier.notes || ''
      })
    } else {
      setEditing(null)
      setFormData({ name: '', code: '', email: '', phone: '', address: '', city: '', country: '', contact_person: '', notes: '' })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setFormData({ name: '', code: '', email: '', phone: '', address: '', city: '', country: '', contact_person: '', notes: '' })
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isAdmin = hasRole('ADMIN')

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A'
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

  const columns = [
    {
      key: 'name',
      header: 'Supplier',
      accessor: 'name',
      align: 'left',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-left">
            <div className="font-medium">{row.name || 'N/A'}</div>
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{row.code || 'N/A'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact_person',
      header: 'Contact Person',
      accessor: 'contact_person',
      align: 'left',
      render: (val) => val || 'N/A'
    },
    {
      key: 'email',
      header: 'Email',
      accessor: 'email',
      align: 'left',
      render: (val) => val || 'N/A'
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: 'phone',
      align: 'left',
      render: (val) => val || 'N/A'
    },
    {
      key: 'location',
      header: 'Location',
      accessor: 'city',
      align: 'left',
      render: (_, row) => (
        <span style={{ color: 'var(--muted-foreground)' }}>
          {[row.city, row.country].filter(Boolean).join(', ') || 'N/A'}
        </span>
      ),
    },
    ...(isAdmin ? [{
      key: 'created_info',
      header: 'Created By',
      accessor: 'id',
      align: 'left',
      render: (_, row) => (
        <div className="text-xs text-left">
          <div className="font-medium">{row.creator ? `${row.creator.first_name} ${row.creator.last_name}` : 'N/A'}</div>
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
          <div className="font-medium">{row.updater ? `${row.updater.first_name} ${row.updater.last_name}` : 'N/A'}</div>
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
          {canUpdateSuppliers && (
            <Button variant="ghost" size="sm" onClick={() => openModal(row)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDeleteSuppliers && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      )
    }
  ]

  if (!canViewSuppliers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>You don't have permission to view suppliers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage your suppliers</p>
        </div>
        {canCreateSuppliers && (
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </Button>
        )}
      </div>

      <DataTable 
        columns={columns} 
        data={paginatedSuppliers} 
        loading={loading} 
        currentPage={currentPage} 
        totalPages={totalPages} 
        totalItems={filteredSuppliers.length} 
        itemsPerPage={itemsPerPage} 
        onPageChange={handlePageChange}
        storageKey="suppliers"
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? 'Edit' : 'Add'} Supplier</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier Code</Label>
                    <Input 
                      value={editing ? formData.code : 'Auto-generated'} 
                      disabled 
                      className="bg-gray-100 dark:bg-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Address</Label><Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} /></div>
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
