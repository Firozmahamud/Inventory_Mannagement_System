import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { inventoryService, productService, warehouseService, locationService } from '../services/api'
import { ArrowDown, ArrowUp, RefreshCcw, MapPin, X } from 'lucide-react'
import { stockService } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Inventory() {
  const { hasPermission, hasRole } = useAuth()
  const [inventory, setInventory] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockType, setStockType] = useState('in')
  const [stockForm, setStockForm] = useState({ product_id: '', from_warehouse_id: '', warehouse_id: '', from_location_id: '', location_id: '', quantity: 0, unit_cost: 0, reason: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const canCreateInventory = hasRole('ADMIN') || hasPermission('create_inventory')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invRes, prodRes, whRes] = await Promise.all([
        inventoryService.getAll(),
        productService.getAll(),
        warehouseService.getAll(),
      ])
      setInventory(invRes.data.data || [])
      setProducts(prodRes.data.data || [])
      setWarehouses(whRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
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

  const handleWarehouseChange = (warehouseId, isFrom = false) => {
    if (isFrom) {
      setStockForm({...stockForm, from_warehouse_id: warehouseId, from_location_id: ''})
    } else {
      setStockForm({...stockForm, warehouse_id: warehouseId, location_id: ''})
    }
    if (warehouseId) {
      fetchLocations(warehouseId)
    }
  }

  const handleSuggestLocation = async () => {
    if (!stockForm.product_id || !stockForm.warehouse_id) {
      alert('Please select product and warehouse first')
      return
    }
    try {
      const res = await locationService.suggest({
        product_id: stockForm.product_id,
        warehouse_id: stockForm.warehouse_id,
        quantity: stockForm.quantity || 1
      })
      if (res.data.length > 0) {
        setStockForm({...stockForm, location_id: res.data[0].id})
      } else {
        alert('No suitable location found')
      }
    } catch (error) {
      console.error('Failed to suggest location:', error)
    }
  }

  const handleStockAction = async (e) => {
    e.preventDefault()
    try {
      const serviceMap = { 
        in: stockService.stockIn, 
        out: stockService.stockOut, 
        transfer: stockService.transfer, 
        adjustment: stockService.adjustment 
      }
      await serviceMap[stockType](stockForm)
      setShowStockModal(false)
      setStockForm({ product_id: '', from_warehouse_id: '', warehouse_id: '', from_location_id: '', location_id: '', quantity: 0, unit_cost: 0, reason: '' })
      fetchData()
    } catch (error) {
      console.error('Stock action failed:', error)
      alert(error.response?.data?.error || 'Stock action failed')
    }
  }

  const getTotalStock = () => inventory.reduce((sum, i) => sum + (i.quantity || 0), 0)
  const getLowStock = () => inventory.filter(i => i.quantity < 10).length

  const totalPages = Math.ceil(inventory.length / itemsPerPage)
  const paginatedInventory = inventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const columns = [
    { key: 'product', header: 'Product', accessor: 'product', align: 'left', render: (_, row) => row.product?.name || 'N/A' },
    { key: 'warehouse', header: 'Warehouse', accessor: 'warehouse', align: 'left', render: (_, row) => row.warehouse?.name || 'N/A' },
    { key: 'location', header: 'Location', accessor: 'location', align: 'left', render: (_, row) => row.location?.code || '-' },
    { key: 'quantity', header: 'Quantity', accessor: 'quantity', align: 'right', render: (val) => val || 0 },
    { key: 'reserved', header: 'Reserved', accessor: 'reserved_quantity', align: 'right', render: (val) => val || 0 },
    { key: 'status', header: 'Status', accessor: 'quantity', align: 'center', render: (val) => {
      if ((val || 0) <= 0) return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Out of Stock</span>
      if ((val || 0) < 10) return <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">Low Stock</span>
      return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">OK</span>
    }}
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Track stock levels across warehouses</p>
        </div>
        <div className="flex gap-2">
          {canCreateInventory && (
            <>
              <Button variant="outline" onClick={() => { setStockType('in'); setShowStockModal(true) }}>
                <ArrowDown className="h-4 w-4 mr-2" /> Stock In
              </Button>
              <Button variant="outline" onClick={() => { setStockType('out'); setShowStockModal(true) }}>
                <ArrowUp className="h-4 w-4 mr-2" /> Stock Out
              </Button>
              <Button variant="outline" onClick={() => { setStockType('transfer'); setShowStockModal(true) }}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Transfer
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Total Stock</p>
            <p className="text-3xl font-bold">{getTotalStock()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Low Stock Items</p>
            <p className="text-3xl font-bold text-orange-600">{getLowStock()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Warehouses</p>
            <p className="text-3xl font-bold">{warehouses.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock by Product & Warehouse</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedInventory}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={inventory.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            storageKey="inventory"
          />
        </CardContent>
      </Card>

      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{stockType === 'in' ? 'Stock In' : stockType === 'out' ? 'Stock Out' : stockType === 'transfer' ? 'Transfer' : 'Adjustment'}</CardTitle>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => setShowStockModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStockAction} className="space-y-4">
                <div className="space-y-2">
                  <Label>Product *</Label>
                  <select className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:text-white dark:border-slate-600" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} value={stockForm.product_id} onChange={e => setStockForm({...stockForm, product_id: e.target.value})} required>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {stockType === 'transfer' && (
                  <>
                    <div className="space-y-2">
                      <Label>From Warehouse *</Label>
                      <select className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:text-white dark:border-slate-600" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} value={stockForm.from_warehouse_id} onChange={e => handleWarehouseChange(e.target.value, true)} required>
                        <option value="">Select source warehouse</option>
                        {warehouses.filter(w => w.is_active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>From Location</Label>
                      <select className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:text-white dark:border-slate-600" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} value={stockForm.from_location_id} onChange={e => setStockForm({...stockForm, from_location_id: e.target.value})}>
                        <option value="">Select source location (optional)</option>
                        {locations.filter(l => !l.is_empty).map(l => <option key={l.id} value={l.id}>{l.code} ({l.current_stock})</option>)}
                      </select>
                    </div>
                  </>
                )}
                  <div className="space-y-2">
                    <Label>{stockType === 'transfer' ? 'To Warehouse *' : 'Warehouse *'}</Label>
                    <select className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:text-white dark:border-slate-600" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} value={stockForm.warehouse_id} onChange={e => handleWarehouseChange(e.target.value)} required>
                    <option value="">Select warehouse</option>
                    {warehouses.filter(w => w.is_active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                {stockType === 'in' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>To Location</Label>
                      <button type="button" className="text-xs text-blue-600 hover:underline flex items-center gap-1" onClick={handleSuggestLocation}>
                        <MapPin className="h-3 w-3" /> Auto-suggest
                      </button>
                    </div>
                    <select className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:text-white dark:border-slate-600" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }} value={stockForm.location_id} onChange={e => setStockForm({...stockForm, location_id: e.target.value})}>
                      <option value="">Select location (optional)</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.code} ({l.utilization}% full)</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" value={stockForm.quantity || ''} onChange={e => setStockForm({...stockForm, quantity: parseInt(e.target.value) || 0})} required />
                </div>
                {stockType === 'in' && (
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input type="number" step="0.01" min="0" value={stockForm.unit_cost || ''} onChange={e => setStockForm({...stockForm, unit_cost: parseFloat(e.target.value) || 0})} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input value={stockForm.reason} onChange={e => setStockForm({...stockForm, reason: e.target.value})} placeholder={stockType === 'in' ? 'e.g., Purchase order' : stockType === 'out' ? 'e.g., Sales order' : 'e.g., Stock adjustment'} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowStockModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={!stockForm.product_id || (stockType === 'transfer' ? !stockForm.from_warehouse_id : !stockForm.warehouse_id) || !stockForm.quantity}>Submit</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}