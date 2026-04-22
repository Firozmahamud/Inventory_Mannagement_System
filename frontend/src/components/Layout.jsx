import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSidebar } from '../context/SidebarContext'

export function Layout() {
  const { collapsed } = useSidebar()

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar />
      <div 
        className="transition-all duration-300"
        style={{ 
          marginLeft: collapsed ? '64px' : '256px',
        }}
      >
        <Header />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}