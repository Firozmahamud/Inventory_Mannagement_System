import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useAuth, PERMISSIONS } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Building2,
  Warehouse,
  Boxes,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  FileText,
  FolderTree,
  MapPin,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', permission: PERMISSIONS.VIEW_DASHBOARD },
  { icon: Package, label: 'Products', path: '/products', permission: PERMISSIONS.VIEW_PRODUCTS },
  { icon: FolderTree, label: 'Categories', path: '/categories', permission: PERMISSIONS.VIEW_PRODUCTS },
  { icon: ShoppingCart, label: 'Orders', path: '/orders', permission: PERMISSIONS.VIEW_ORDERS },
  { icon: Boxes, label: 'Inventory', path: '/inventory', permission: PERMISSIONS.VIEW_INVENTORY },
  { icon: MapPin, label: 'Storage Locations', path: '/locations', permission: PERMISSIONS.VIEW_WAREHOUSES },
  { icon: Warehouse, label: 'Warehouses', path: '/warehouses', permission: PERMISSIONS.VIEW_WAREHOUSES },
  { icon: Building2, label: 'Suppliers', path: '/suppliers', permission: PERMISSIONS.VIEW_SUPPLIERS },
  { icon: Users, label: 'Users', path: '/users', permission: PERMISSIONS.VIEW_USERS },
  { icon: Shield, label: 'Roles', path: '/roles', permission: PERMISSIONS.VIEW_ROLES },
  { icon: FileText, label: 'Reports', path: '/reports', permission: PERMISSIONS.VIEW_REPORTS },
  { icon: Settings, label: 'Settings', path: '/settings', permission: null },
]

export function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebar()
  const location = useLocation()
  const { logout, hasPermission, hasRole, user, roles } = useAuth()

  const visibleItems = menuItems.filter(item => 
    item.permission === null || hasPermission(item.permission) || hasRole('ADMIN')
  )

  const primaryRole = roles && roles.length > 0 ? (typeof roles[0] === 'string' ? roles[0] : roles[0].name) : 'User'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      style={{ 
        backgroundColor: 'var(--sidebar)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between px-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-600">Inventory</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" style={{ color: 'var(--sidebar-foreground)' }} />
            ) : (
              <ChevronLeft className="h-5 w-5" style={{ color: 'var(--sidebar-foreground)' }} />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                )}
                style={{ 
                  color: isActive ? '#2563eb' : 'var(--sidebar-foreground)',
                  backgroundColor: isActive ? undefined : 'transparent'
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" style={{ color: isActive ? '#2563eb' : 'inherit' }} />
                {!collapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-2" style={{ borderColor: 'var(--border)' }}>
          {!collapsed && user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--sidebar-foreground)' }}>
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 inline-block mt-1">{primaryRole}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ color: '#dc2626' }}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}
