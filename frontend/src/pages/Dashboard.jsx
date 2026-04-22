import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Package, TrendingUp, AlertTriangle, DollarSign, ArrowUpDown } from 'lucide-react'
import { dashboardService } from '../services/api'
import { useTheme } from '../context/ThemeContext'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

const StatCard = ({ title, value, icon: Icon, change, color }) => (
  <Card className="hover:shadow-md transition-shadow cursor-pointer">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>{value}</p>
          {change && (
            <p className="text-sm mt-1" style={{ color: change >= 0 ? '#16a34a' : '#dc2626' }}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [salesData, setSalesData] = useState([])
  const [stockData, setStockData] = useState([])
  const [loading, setLoading] = useState(true)
  const { darkMode } = useTheme()

  const chartColors = {
    grid: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#94a3b8' : '#64748b',
    tooltip: {
      bg: darkMode ? '#1e293b' : '#ffffff',
      border: darkMode ? '#334155' : '#e2e8f0',
      text: darkMode ? '#f8fafc' : '#0f172a'
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, salesRes, stockRes] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getSalesChart(),
          dashboardService.getStockChart(),
        ])
        setStats(statsRes.data)
        setSalesData(salesRes.data.labels?.map((label, i) => ({
          date: label,
          sales: salesRes.data.datasets[i],
        })) || [])
        setStockData(stockRes.data.labels?.map((label, i) => ({
          category: label,
          stock: stockRes.data.datasets[i],
        })) || [])
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400" style={{ color: 'var(--muted-foreground)' }}>Welcome back! Here's your inventory overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.total_products || 0}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Stock"
          value={stats?.total_stock?.toLocaleString() || 0}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.low_stock_items || 0}
          icon={AlertTriangle}
          color="bg-orange-500"
        />
        <StatCard
          title="Total Sales"
          value={`$${(stats?.total_sales || 0).toLocaleString()}`}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="date" tick={{ fill: chartColors.text }} />
                  <YAxis tick={{ fill: chartColors.text }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip.bg, borderColor: chartColors.tooltip.border, color: chartColors.tooltip.text }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="category" tick={{ fill: chartColors.text }} />
                  <YAxis tick={{ fill: chartColors.text }} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip.bg, borderColor: chartColors.tooltip.border, color: chartColors.tooltip.text }} />
                  <Legend />
                  <Bar dataKey="stock" fill="#10b981" name="Stock" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--secondary)' }}>
                      <ArrowUpDown className="h-4 w-4" style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Stock Transfer</p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Warehouse 1 → Warehouse 2</p>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>2 hours ago</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Product A', 'Product B', 'Product C'].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors" style={{ backgroundColor: 'var(--secondary)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{item}</p>
                    <p className="text-sm" style={{ color: '#f97316' }}>5 units left</p>
                  </div>
                  <AlertTriangle className="h-5 w-5" style={{ color: '#f97316' }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}