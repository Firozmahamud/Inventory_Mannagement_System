import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAuth, PERMISSIONS } from '../context/AuthContext'
import { 
  FileText, Download, Package, ShoppingCart, Warehouse, 
  Users as UsersIcon, BarChart3, TrendingUp, TrendingDown 
} from 'lucide-react'
import { 
  productService, orderService, inventoryService, 
  warehouseService, userService 
} from '../services/api'

const REPORT_TYPES = [
  {
    id: 'products',
    title: 'Products Report',
    description: 'Complete list of all products with details',
    icon: Package,
    permission: PERMISSIONS.VIEW_PRODUCTS,
    columns: ['SKU', 'Name', 'Category', 'Cost', 'Price', 'Stock', 'Status'],
    fetchData: async () => {
      const [prodRes, invRes] = await Promise.all([
        productService.getAll({ limit: 10000 }),
        inventoryService.getAll({ limit: 10000 })
      ])
      const products = prodRes.data.data || []
      const inventory = invRes.data.data || []
      
      const getProductStock = (productId) => {
        return inventory
          .filter(inv => String(inv.product_id) === String(productId) || String(inv.product?.id) === String(productId))
          .reduce((sum, inv) => sum + (inv.quantity || 0), 0)
      }
      
      return products.map(p => ({
        sku: p.sku || '-',
        name: `${p.name}`,
        category: p.category?.name || '-',
        cost: `$${(p.cost_price || 0).toFixed(2)}`,
        price: `$${(p.sell_price || 0).toFixed(2)}`,
        stock: getProductStock(p.id),
        status: p.is_active ? 'Active' : 'Inactive'
      }))
    }
  },
  {
    id: 'inventory',
    title: 'Inventory Report',
    description: 'Current stock levels across all warehouses',
    icon: Warehouse,
    permission: PERMISSIONS.VIEW_INVENTORY,
    columns: ['Product', 'Warehouse', 'Quantity', 'Reserved', 'Status'],
    fetchData: async () => {
      const res = await inventoryService.getAll({ limit: 10000 })
      return (res.data.data || []).map(inv => ({
        product: inv.product?.name || '-',
        warehouse: inv.warehouse?.name || '-',
        quantity: inv.quantity || 0,
        reserved: inv.reserved_quantity || 0,
        status: (inv.quantity || 0) <= 0 ? 'Out of Stock' : (inv.quantity || 0) < 10 ? 'Low Stock' : 'OK'
      }))
    }
  },
  {
    id: 'orders',
    title: 'Orders Report',
    description: 'Summary of all purchase and sales orders',
    icon: ShoppingCart,
    permission: PERMISSIONS.VIEW_ORDERS,
    columns: ['Order No', 'Supplier/Customer', 'Total', 'Status', 'Date'],
    fetchData: async () => {
      const res = await orderService.getAll({ limit: 10000 })
      return (res.data.data || []).map(order => ({
        orderNo: order.order_no || order.id?.slice(0, 8) || '-',
        customer: order.customer_name || order.supplier?.name || '-',
        total: `$${(order.total_amount || 0).toFixed(2)}`,
        status: order.status || '-',
        date: order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'
      }))
    }
  },
  {
    id: 'warehouses',
    title: 'Warehouses Report',
    description: 'Overview of all warehouses and capacity',
    icon: BarChart3,
    permission: PERMISSIONS.VIEW_WAREHOUSES,
    columns: ['Code', 'Name', 'City', 'Country', 'Primary', 'Status'],
    fetchData: async () => {
      const res = await warehouseService.getAll({ limit: 10000 })
      return (res.data.data || []).map(wh => ({
        code: wh.code || '-',
        name: wh.name || '-',
        city: wh.city || '-',
        country: wh.country || '-',
        primary: wh.is_primary ? 'Yes' : 'No',
        status: wh.is_active ? 'Active' : 'Inactive'
      }))
    }
  },
  {
    id: 'users',
    title: 'Users Report',
    description: 'List of all system users and their roles',
    icon: UsersIcon,
    permission: PERMISSIONS.VIEW_USERS,
    columns: ['Name', 'Email', 'Phone', 'Roles', 'Status', 'Created'],
    fetchData: async () => {
      const res = await userService.getAll({ limit: 1000 })
      return (res.data.data || []).map(user => ({
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        email: user.email || '-',
        phone: user.phone || '-',
        roles: '-',
        status: user.is_active ? 'Active' : 'Inactive',
        created: new Date(user.created_at).toLocaleDateString()
      }))
    }
  }
]

export default function Reports() {
  const { hasPermission, hasRole } = useAuth()
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportData, setReportData] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const canViewReports = hasRole('ADMIN') || hasPermission(PERMISSIONS.VIEW_REPORTS)

  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>Access Denied</h2>
          <p style={{ color: 'var(--muted-foreground)' }}>You don't have permission to view reports.</p>
        </div>
      </div>
    )
  }

  const loadReport = async (report) => {
    setSelectedReport(report)
    setLoading(true)
    setReportData([])
    
    try {
      const data = await report.fetchData()
      setReportData(data)
    } catch (error) {
      console.error('Failed to load report:', error)
      alert('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    if (!selectedReport || reportData.length === 0) return
    
    setExporting(true)
    
    try {
      const headers = selectedReport.columns.join(',')
      const rows = reportData.map(row => 
        selectedReport.columns.map(col => {
          const value = row[col.toLowerCase().replace(/ /g, '')] ?? row[col] ?? ''
          return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
      )
      
      const csv = [headers, ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${selectedReport.id}_report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Failed to export:', error)
      alert('Failed to export report')
    } finally {
      setExporting(false)
    }
  }

  const downloadPDF = () => {
    if (!selectedReport || reportData.length === 0) return
    
    setExporting(true)
    
    try {
      const printContent = `
        <html>
          <head>
            <title>${selectedReport.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #3b82f6; color: white; }
              tr:nth-child(even) { background-color: #f9f9f9; }
              .footer { margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h1>${selectedReport.title}</h1>
            <p>${selectedReport.description}</p>
            <table>
              <thead>
                <tr>${selectedReport.columns.map(col => `<th>${col}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${reportData.map(row => `
                  <tr>${selectedReport.columns.map(col => {
                    const value = row[col.toLowerCase().replace(/ /g, '')] ?? row[col] ?? ''
                    return `<td>${value}</td>`
                  }).join('')}</tr>
                `).join('')}
              </tbody>
            </table>
            <div class="footer">
              Generated on: ${new Date().toLocaleString()} | Total Records: ${reportData.length}
            </div>
          </body>
        </html>
      `
      
      const printWindow = window.open('', '_blank')
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const availableReports = REPORT_TYPES.filter(r => 
    hasRole('ADMIN') || hasPermission(r.permission)
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Generate and download dynamic reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableReports.map(report => (
          <Card 
            key={report.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedReport?.id === report.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => loadReport(report)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{report.title}</CardTitle>
              <report.icon className="h-6 w-6 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedReport && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedReport.title}</CardTitle>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                {reportData.length} records found
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={downloadCSV}
                disabled={exporting || reportData.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
              <Button 
                onClick={downloadPDF}
                disabled={exporting || reportData.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : reportData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-slate-800/50" style={{ borderColor: 'var(--border)' }}>
                      {selectedReport.columns.map(col => (
                        <th key={col} className="text-left py-3 px-4 font-medium" style={{ color: 'var(--muted-foreground)' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50 dark:hover:bg-slate-800/50" style={{ borderColor: 'var(--border)' }}>
                        {selectedReport.columns.map(col => (
                          <td key={col} className="py-3 px-4">
                            {row[col.toLowerCase().replace(/ /g, '')] ?? row[col] ?? '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--muted-foreground)' }}>
                No data available for this report
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
