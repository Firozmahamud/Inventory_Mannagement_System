import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Label } from '../components/ui/Input'
import { DataTable } from '../components/ui/DataTable'
import { productService, categoryService, inventoryService, supplierService } from '../services/api'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { showSuccessSimple, showErrorSimple, showDeleteConfirm } from '../lib/swal'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
]

export default function Products() {
  const { hasPermission, hasRole } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    name: '', sku: '', description: '', category_id: '', unit: 'PCS',
    cost_price: 0, sell_price: 0, currency: 'USD', min_stock_level: 0, max_stock_level: 0, reorder_point: 0,
    supplier_id: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [prodRes, catRes, supRes, invRes] = await Promise.all([
        productService.getAll(),
        categoryService.getAll(),
        supplierService.getAll({ limit: 10000 }),
        inventoryService.getAll({ limit: 10000 })
      ])
      console.log('Suppliers response:', supRes.data)
      setProducts(prodRes.data.data || [])
      setCategories(catRes.data.data || [])
      setSuppliers(supRes.data.data || [])
      setInventory(invRes.data.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        const res = await productService.update(editingProduct.id, formData)
        const updatedProduct = res.data.data || res.data
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...updatedProduct } : p))
        showSuccessSimple('Product updated successfully!')
      } else {
        const res = await productService.create(formData)
        const newProduct = res.data.data || res.data
        setProducts([newProduct, ...products])
        showSuccessSimple('Product created successfully!')
      }
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ name: '', sku: '', description: '', category_id: '', unit: 'PCS', cost_price: 0, sell_price: 0, currency: 'USD', min_stock_level: 0, max_stock_level: 0, reorder_point: 0, supplier_id: '' })
    } catch (error) {
      console.error('Failed to save product:', error)
      const message = error.response?.data?.error || 'Failed to save product. Please try again.'
      showErrorSimple(message)
    }
  }

  const handleDelete = async (id, productName) => {
    const confirmed = await showDeleteConfirm(productName || 'this product')
    if (confirmed) {
      try {
        await productService.delete(id)
        setProducts(products.filter(p => p.id !== id))
        showSuccessSimple('Product deleted successfully!')
      } catch (error) {
        console.error('Failed to delete product:', error)
        const message = error.response?.data?.error || 'Failed to delete product. Please try again.'
        showErrorSimple(message)
      }
    }
  }

  const handleNoPermission = (action) => {
    showErrorSimple(`You don't have permission to ${action} products. Please contact your administrator.`)
  }

  const canViewProducts = hasRole('ADMIN') || hasPermission('view_products')
  const canCreateProducts = hasRole('ADMIN') || hasPermission('create_products')
  const canUpdateProducts = hasRole('ADMIN') || hasPermission('update_products')
  const canDeleteProducts = hasRole('ADMIN') || hasPermission('delete_products')

  const getCurrencySymbol = (code) => {
    const currency = CURRENCIES.find(c => c.code === code)
    return currency ? currency.symbol : code || '$'
  }

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
    { key: 'sku', header: 'SKU', accessor: 'sku', align: 'left' },
    { key: 'name', header: 'Name', accessor: 'name', align: 'left' },
    { key: 'category', header: 'Category', accessor: 'category', align: 'left', render: (_, row) => row.category?.name || '-' },
    { key: 'supplier', header: 'Supplier', accessor: 'supplier', align: 'left', render: (_, row) => getSupplierName(row) },
    { key: 'cost', header: 'Cost', accessor: 'cost_price', align: 'right', render: (val, row) => `${getCurrencySymbol(row.currency)}${val?.toFixed(2)}` },
    { key: 'price', header: 'Price', accessor: 'sell_price', align: 'right', render: (val, row) => `${getCurrencySymbol(row.currency)}${val?.toFixed(2)}` },
    { key: 'currency', header: 'Currency', accessor: 'currency', align: 'center', render: (val) => (
      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        {val || 'USD'}
      </span>
    )},
    { key: 'stock', header: 'Stock', accessor: 'id', align: 'center', render: (_, row) => {
      const stock = getProductStock(row.id)
      const lowStock = stock > 0 && stock < row.reorder_point
      const noStock = stock === 0
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${noStock ? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300' : lowStock ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
          {stock}
        </span>
      )
    }},
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
    { key: 'actions', header: 'Actions', accessor: 'id', noDrag: true, align: 'center', render: (id, row) => (
      <div className="flex items-center justify-end gap-2">
        {canUpdateProducts ? (
          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors" onClick={() => { 
            const productSupplierId = row.product_suppliers && row.product_suppliers.length > 0 ? row.product_suppliers[0].supplier_id : ''
            setEditingProduct(row); 
            setFormData({...row, supplier_id: productSupplierId || '', currency: row.currency || 'USD'}); 
            setShowModal(true) 
          }}>
            <Edit className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          </button>
        ) : (
          <span className="p-1.5 opacity-30 cursor-not-allowed" title="No edit permission">
            <Edit className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          </span>
        )}
        {canDeleteProducts ? (
          <button className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" onClick={() => handleDelete(id, row.name)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        ) : (
          <span className="p-1.5 opacity-30 cursor-not-allowed" title="No delete permission">
            <Trash2 className="h-4 w-4 text-red-500" />
          </span>
        )}
      </div>
    )}
  ]

  const getProductStock = (productId) => {
    return inventory
      .filter(inv => String(inv.product_id) === String(productId) || String(inv.product?.id) === String(productId))
      .reduce((sum, inv) => sum + (inv.quantity || 0), 0)
  }

  const getSupplierName = (product) => {
    if (product.product_suppliers && product.product_suppliers.length > 0 && product.product_suppliers[0].supplier) {
      return product.product_suppliers[0].supplier.name
    }
    if (product.supplier) {
      return product.supplier.name || '-'
    }
    return '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Products</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage your product inventory</p>
        </div>
        {canCreateProducts && (
          <Button onClick={() => { setEditingProduct(null); setShowModal(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={paginatedProducts}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredProducts.length}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        storageKey="products"
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</CardTitle>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea 
                    className="w-full h-20 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    style={{ borderColor: 'var(--border)' }} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select 
                    className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    style={{ borderColor: 'var(--border)' }} 
                    value={formData.category_id || ''} 
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                  >
                    <option value="">Select category</option>
                    {categories.filter(c => c.is_active !== false).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  {suppliers.length === 0 ? (
                    <p className="text-sm py-2" style={{ color: 'var(--muted-foreground)' }}>No suppliers available. <a href="/suppliers" className="text-blue-600 hover:underline">Add suppliers first</a>.</p>
                  ) : (
                    <select 
                      className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                      style={{ borderColor: 'var(--border)' }} 
                      value={formData.supplier_id || ''} 
                      onChange={e => setFormData({...formData, supplier_id: e.target.value})}
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select 
                    className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    style={{ borderColor: 'var(--border)' }} 
                    value={formData.currency || 'USD'} 
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cost Price ({getCurrencySymbol(formData.currency)})</Label>
                    <Input type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: parseFloat(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sell Price ({getCurrencySymbol(formData.currency)})</Label>
                    <Input type="number" step="0.01" value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Stock</Label>
                    <Input type="number" value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Stock</Label>
                    <Input type="number" value={formData.max_stock_level} onChange={e => setFormData({...formData, max_stock_level: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Point</Label>
                    <Input type="number" value={formData.reorder_point} onChange={e => setFormData({...formData, reorder_point: parseInt(e.target.value)})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit">{editingProduct ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}