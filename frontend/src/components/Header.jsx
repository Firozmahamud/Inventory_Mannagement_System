import { Bell, Search, Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Input } from './ui/Input'

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar && avatar.trim() !== '') return avatar
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3b82f6&color=fff&size=128&font-size=0.4&bold=true`
}

export function Header() {
  const { user, roles } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()

  const primaryRole = roles && roles.length > 0 ? (typeof roles[0] === 'string' ? roles[0] : roles[0].name) : 'User'
  const avatarUrl = getAvatarUrl(user?.avatar, user?.first_name, user?.last_name)

  return (
    <header 
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6"
      style={{ 
        borderColor: 'var(--border)', 
        backgroundColor: 'var(--card)',
        color: 'var(--foreground)'
      }}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" 
            style={{ color: 'var(--muted-foreground)' }} 
          />
          <Input
            placeholder="Search..."
            className="pl-10 w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
          )}
        </button>

        <button className="p-2 rounded-lg relative hover:bg-gray-100 dark:hover:bg-slate-700">
          <Bell className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l" style={{ borderColor: 'var(--border)' }}>
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-9 w-9 rounded-full object-cover bg-blue-100"
          />
          <div className="hidden md:block">
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{user?.first_name} {user?.last_name}</p>
            <p className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 inline-block">{primaryRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}