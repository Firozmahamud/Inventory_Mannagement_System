import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext()

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  const toggleSidebar = () => setCollapsed(!collapsed)

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
