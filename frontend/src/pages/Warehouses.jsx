import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Input'
import { warehouseService } from '../services/api'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

export default function Warehouses() {
  const { hasPermission, hasRole } = useAuth()
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ name: '', code: '', address: '', city: '', country: '', is_primary: false })

  const canViewWarehouses = hasRole('ADMIN') || hasPermission('view_warehouses')
  const canCreateWarehouses = hasRole('ADMIN') || hasPermission('create_warehouses')
  const canUpdateWarehouses = hasRole('ADMIN') || hasPermission('update_warehouses')
  const canDeleteWarehouses = hasRole('ADMIN') || hasPermission('delete_warehouses')

  useEffect(() => { fetchWarehouses() }, [])

  const fetchWarehouses = async () => {
    try {
      const res = await warehouseService.getAll()
      setWarehouses(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const existingCode = warehouses.find(w => 
      w.code.toLowerCase() === formData.code.toLowerCase() && 
      (!editing || w.id !== editing.id)
    )
    if (existingCode) {
      showErrorSimple('Warehouse code already exists. Please use a different code.')
      return
    }
    
    if (editing) {
      try {
        const res = await warehouseService.update(editing.id, formData)
        const updatedWarehouse = res.data.data || res.data
        setWarehouses(prev => prev.map(w => String(w.id) === String(editing.id) ? { ...w, ...updatedWarehouse } : w))
        showSuccessSimple('Warehouse updated successfully!')
      } catch (error) {
        console.error('Failed to update warehouse:', error)
        showErrorSimple(error.response?.data?.error || 'Failed to update warehouse')
      }
    } else {
      try {
        const res = await warehouseService.create(formData)
        const newWarehouse = res.data.data || res.data
        setWarehouses(prev => [newWarehouse, ...prev])
        showSuccessSimple('Warehouse created successfully!')
      } catch (error) {
        console.error('Failed to create warehouse:', error)
        showErrorSimple(error.response?.data?.error || 'Failed to create warehouse')
      }
    }
    setShowModal(false)
    setEditing(null)
    setFormData({ name: '', code: '', address: '', city: '', country: '', is_primary: false })
  }

  const handleDelete = async (warehouse) => {
    const confirmed = await showDeleteConfirm(warehouse.name)
    if (!confirmed) return
    
    try {
      await warehouseService.delete(warehouse.id)
      setWarehouses(warehouses.filter(w => w.id !== warehouse.id))
      showSuccessSimple('Warehouse deleted successfully!')
    } catch (error) {
      console.error('Failed to delete:', error)
      const message = error.response?.data?.error || 'Failed to delete warehouse. Please try again.'
      showErrorSimple(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouses</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage your warehouses</p>
        </div>
        {canCreateWarehouses && (
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Warehouse
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : [...warehouses].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)).map((wh) => (
          <Card key={wh.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{wh.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{wh.code}</p>
                </div>
                  {wh.is_primary && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full">Primary</span>
                  )}
              </div>
              <div className="mt-4 space-y-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <p>{wh.address}</p>
                <p>{wh.city}, {wh.country}</p>
              </div>
              <div className="mt-4 flex gap-2">
                {canUpdateWarehouses && (
                  <Button variant="outline" size="sm" onClick={() => { console.log('Edit clicked:', wh); setEditing(wh); setFormData(wh); setShowModal(true) }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {canDeleteWarehouses && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(wh)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editing ? 'Edit' : 'Add'} Warehouse</CardTitle>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => { setShowModal(false); setEditing(null); setFormData({ name: '', code: '', address: '', city: '', country: '', is_primary: false }) }}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.is_primary} onChange={e => setFormData({...formData, is_primary: e.target.checked})} />
                  <Label className="!mt-0">Primary Warehouse</Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); setFormData({ name: '', code: '', address: '', city: '', country: '', is_primary: false }) }}>Cancel</Button>
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