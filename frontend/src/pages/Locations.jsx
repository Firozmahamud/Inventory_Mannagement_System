import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { warehouseService, locationService, productService } from '../services/api'
import { Plus, Grid3x3, List, Map, Trash2, Edit, Eye, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

export default function Locations() {
  const { hasPermission, hasRole } = useAuth()
  const [warehouses, setWarehouses] = useState([])
  const [locations, setLocations] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list')
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [locationContents, setLocationContents] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    warehouse_id: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
    bin: '',
    max_capacity: 100
  })

  useEffect(() => {
    fetchWarehouses()
    fetchProducts()
  }, [])

  useEffect(() => {
    if (selectedWarehouse) {
      fetchLocations(selectedWarehouse)
    }
  }, [selectedWarehouse])

  const canUpdateLocations = hasRole('ADMIN') || hasPermission('update_inventory')
  const canDeleteLocations = hasRole('ADMIN') || hasPermission('delete_inventory')

  const fetchWarehouses = async () => {
    try {
      const res = await warehouseService.getAll()
      const whs = res.data.data || []
      setWarehouses(whs)
      if (!selectedWarehouse) {
        const primaryWh = whs.find(w => w.is_primary)
        setSelectedWarehouse(primaryWh?.id || whs[0]?.id || null)
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocations = async (warehouseId) => {
    try {
      const res = await locationService.getAll({ warehouse_id: warehouseId })
      setLocations(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await productService.getAll({ limit: 10000 })
      setProducts(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
    }
  }

  const fetchLocationContents = async (locationId) => {
    try {
      const res = await locationService.getContents(locationId)
      setLocationContents(res.data)
    } catch (error) {
      console.error('Failed to fetch location contents:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingLocation) {
        const res = await locationService.update(editingLocation.id, formData)
        const updatedLocation = res.data.data || res.data
        setLocations(locations.map(l => l.id === editingLocation.id ? { ...l, ...updatedLocation } : l))
        showSuccessSimple('Location updated successfully!')
      } else {
        const res = await locationService.create(formData)
        const newLocation = res.data.data || res.data
        setLocations([newLocation, ...locations])
        showSuccessSimple('Location created successfully!')
      }
      setShowModal(false)
      setEditingLocation(null)
      setFormData({ warehouse_id: selectedWarehouse, zone: '', aisle: '', rack: '', shelf: '', bin: '', max_capacity: 100 })
    } catch (error) {
      console.error('Failed to save location:', error)
      showErrorSimple(error.response?.data?.error || 'Failed to save location')
    }
  }

  const handleDelete = async (location) => {
    const confirmed = await showDeleteConfirm(location.code)
    if (!confirmed) return
    
    try {
      await locationService.delete(location.id)
      setLocations(locations.filter(l => l.id !== location.id))
      showSuccessSimple('Location deleted successfully!')
    } catch (error) {
      console.error('Failed to delete location:', error)
      showErrorSimple(error.response?.data?.error || 'Failed to delete location')
    }
  }

  const openEditModal = (location) => {
    setEditingLocation(location)
    setFormData({
      warehouse_id: location.warehouse_id,
      zone: location.zone,
      aisle: location.aisle,
      rack: location.rack,
      shelf: location.shelf,
      bin: location.bin,
      max_capacity: location.max_capacity
    })
    setShowModal(true)
  }

  const openLocationDetails = (location) => {
    setSelectedLocation(location)
    fetchLocationContents(location.id)
  }

  const getZoneColor = (location) => {
    if (location.is_empty) return 'bg-gray-100 border-gray-300 hover:bg-gray-200'
    if (location.is_full) return 'bg-red-100 border-red-300 hover:bg-red-200'
    if (location.is_partial) return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200'
    return 'bg-green-100 border-green-300 hover:bg-green-200'
  }

  const getZoneLabel = (location) => {
    if (location.is_empty) return 'Empty'
    if (location.is_full) return 'Full'
    if (location.is_partial) return `${location.utilization}%`
    return 'OK'
  }

  const getZoneColorClass = (location) => {
    if (location.is_empty) return 'text-gray-600'
    if (location.is_full) return 'text-red-600'
    if (location.is_partial) return 'text-yellow-600'
    return 'text-green-600'
  }

  const zones = [...new Set(locations.map(l => l.zone))].sort()
  const groupedByZone = zones.map(zone => ({
    zone,
    locations: locations.filter(l => l.zone === zone)
  }))

  const selectedWarehouseObj = warehouses.find(w => w.id === selectedWarehouse)

  const totalPages = Math.ceil(locations.length / itemsPerPage)
  const paginatedLocations = locations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const locationColumns = [
    { key: 'code', header: 'Code', accessor: 'code', align: 'left' },
    { key: 'zone', header: 'Zone', accessor: 'zone', align: 'left' },
    { key: 'aisle', header: 'Aisle', accessor: 'aisle', align: 'left' },
    { key: 'rack', header: 'Rack', accessor: 'rack', align: 'left' },
    { key: 'shelf', header: 'Shelf', accessor: 'shelf', align: 'left' },
    { key: 'bin', header: 'Bin', accessor: 'bin', align: 'left' },
    { key: 'utilization', header: 'Utilization', accessor: 'utilization', align: 'center', render: (val) => `${val || 0}%` },
    { key: 'status', header: 'Status', accessor: 'is_empty', align: 'center', render: (_, row) => {
      if (row.is_empty) return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">Empty</span>
      if (row.is_full) return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-600">Full</span>
      if (row.is_partial) return <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-600">Partial</span>
      return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-600">OK</span>
    }},
    { key: 'actions', header: 'Actions', accessor: 'id', noDrag: true, align: 'center', render: (id, row) => (
      <div className="flex items-center justify-end gap-2">
        <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => openLocationDetails(row)}>
          <Eye className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
        </button>
        {canUpdateLocations && (
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => openEditModal(row)}>
            <Edit className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          </button>
        )}
        {canDeleteLocations && (
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => handleDelete(row)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        )}
      </div>
    )}
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Storage Locations</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage warehouse bin locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setViewMode('map')} className={viewMode === 'map' ? 'bg-blue-50' : ''}>
            <Map className="h-4 w-4 mr-2" /> Map
          </Button>
          <Button variant="outline" onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'bg-blue-50' : ''}>
            <List className="h-4 w-4 mr-2" /> List
          </Button>
          <Button onClick={() => {
            setEditingLocation(null)
            setFormData({ warehouse_id: selectedWarehouse, zone: '', aisle: '', rack: '', shelf: '', bin: '', max_capacity: 100 })
            setShowModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" /> Add Location
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-64">
          <Label>Select Warehouse</Label>
          <select 
            className="w-full h-10 px-3 border rounded-md mt-1 dark:bg-slate-800 dark:text-white dark:border-slate-600"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
            value={selectedWarehouse || ''}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">Select warehouse</option>
            {warehouses.filter(w => w.is_active).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <div className="space-y-6">
              {groupedByZone.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
                    <Grid3x3 className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                    <p>No locations found for this warehouse.</p>
                    <p className="text-sm mt-1">Click "Add Location" to create bin locations.</p>
                  </CardContent>
                </Card>
              ) : (
                groupedByZone.map(({ zone, locations: zoneLocations }) => {
                  const aisles = [...new Set(zoneLocations.map(l => l.aisle))].sort()
                  return (
                    <Card key={zone}>
                      <CardHeader>
                        <CardTitle className="text-lg">Zone {zone}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-6 overflow-x-auto pb-2">
                          {aisles.map(aisle => {
                            const aisleLocations = zoneLocations.filter(l => l.aisle === aisle)
                            const racks = [...new Set(aisleLocations.map(l => l.rack))].sort()
                            return (
                              <div key={aisle} className="flex flex-col gap-2 min-w-[100px]">
                                <div className="text-xs font-medium text-gray-500 text-center">Aisle {aisle}</div>
                                <div className="flex flex-col gap-1">
                                  {racks.map(rack => {
                                    const rackLocations = aisleLocations.filter(l => l.rack === rack)
                                    return (
                                      <div key={rack} className="flex flex-col gap-0.5">
                                        <div className="text-[10px] text-gray-400 text-center">{rack}</div>
                                        <div className="flex gap-0.5">
                                          {rackLocations.map(loc => (
                                            <div
                                              key={loc.id}
                                              className={`w-6 h-6 border rounded cursor-pointer flex items-center justify-center text-[8px] font-medium transition-colors ${getZoneColor(loc)}`}
                                              onClick={() => openLocationDetails(loc)}
                                              title={`${loc.code}\nStock: ${loc.current_stock}/${loc.max_capacity}`}
                                            >
                                              {loc.bin}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex gap-4 mt-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                            <span>Available</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                            <span>Partial</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                            <span>Full</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                            <span>Empty</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          ) : (
            <DataTable
              columns={locationColumns}
              data={paginatedLocations}
              loading={loading}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={locations.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              storageKey="locations"
            />
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</CardTitle>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Zone *</Label>
                    <Input 
                      value={formData.zone} 
                      onChange={e => setFormData({...formData, zone: e.target.value.toUpperCase()})}
                      placeholder="A"
                      required 
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aisle *</Label>
                    <Input 
                      value={formData.aisle} 
                      onChange={e => setFormData({...formData, aisle: e.target.value.toUpperCase()})}
                      placeholder="01"
                      required 
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rack *</Label>
                    <Input 
                      value={formData.rack} 
                      onChange={e => setFormData({...formData, rack: e.target.value.toUpperCase()})}
                      placeholder="R1"
                      required 
                      maxLength={5}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Shelf *</Label>
                    <Input 
                      value={formData.shelf} 
                      onChange={e => setFormData({...formData, shelf: e.target.value.toUpperCase()})}
                      placeholder="S1"
                      required 
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bin *</Label>
                    <Input 
                      value={formData.bin} 
                      onChange={e => setFormData({...formData, bin: e.target.value.toUpperCase()})}
                      placeholder="B1"
                      required 
                      maxLength={5}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max Capacity</Label>
                  <Input 
                    type="number" 
                    value={formData.max_capacity} 
                    onChange={e => setFormData({...formData, max_capacity: parseInt(e.target.value) || 100})}
                    min={1}
                  />
                </div>
                {!editingLocation && (
                  <div className="p-3 rounded-md dark:bg-slate-800">
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Location Code: <span className="font-mono font-semibold">
                        {formData.zone || '?'}-{formData.aisle || '?'}-{formData.rack || '?'}-{formData.shelf || '?'}-{formData.bin || '?'}
                      </span>
                    </p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit">{editingLocation ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-mono">{selectedLocation.code}</CardTitle>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedWarehouseObj?.name} - Zone {selectedLocation.zone}, Aisle {selectedLocation.aisle}
                </p>
              </div>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => setSelectedLocation(null)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg p-3 text-center dark:bg-slate-800">
                    <p className="text-2xl font-bold">{selectedLocation.max_capacity}</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Max Capacity</p>
                  </div>
                  <div className="rounded-lg p-3 text-center dark:bg-slate-800">
                    <p className="text-2xl font-bold">{selectedLocation.current_stock}</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Current Stock</p>
                  </div>
                  <div className="rounded-lg p-3 text-center dark:bg-slate-800">
                    <p className="text-2xl font-bold">{selectedLocation.utilization}%</p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Utilization</p>
                  </div>
                </div>

                  <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--muted-foreground)' }}>
                  <div 
                    className={`h-2 rounded-full ${selectedLocation.is_full ? 'bg-red-500' : selectedLocation.is_partial ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(selectedLocation.utilization, 100)}%` }}
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Contents ({locationContents?.total_items || 0} items)</h4>
                  {locationContents?.contents && locationContents.contents.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {locationContents.contents.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-2 rounded dark:bg-slate-800">
                          <div>
                            <p className="font-medium">{inv.product?.name || 'Unknown'}</p>
                            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{inv.product?.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{inv.quantity}</p>
                            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{inv.product?.unit || 'PCS'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No products in this location.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
