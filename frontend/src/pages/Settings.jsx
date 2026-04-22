import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PasswordInput, Label } from '../components/ui/Input'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun, X, Camera, User } from 'lucide-react'
import { authService, userService } from '../services/api'
import { showSuccessSimple, showErrorSimple } from '../lib/swal'

const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&size=128&font-size=0.4&bold=true'

const getAvatarUrl = (avatar, firstName, lastName) => {
  if (avatar && avatar.trim() !== '') return avatar
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=3b82f6&color=fff&size=128&font-size=0.4&bold=true`
}

export default function Settings() {
  const { user, roles, setUser, refreshAuth } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileInputRef = useRef(null)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const primaryRole = roles && roles.length > 0 ? roles[0].name : 'User'

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showErrorSimple('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result
      setAvatarPreview(base64)
      
      setAvatarLoading(true)
      try {
        console.log('Updating avatar for user ID:', user.id)
        await userService.update(user.id, { avatar: base64 })
        await refreshAuth()
        showSuccessSimple('Profile picture updated successfully!')
      } catch (error) {
        console.error('Upload error:', error)
        console.error('Error response:', error.response?.data)
        showErrorSimple(error.response?.data?.error || error.message || 'Failed to update profile picture')
        setAvatarPreview(null)
      } finally {
        setAvatarLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true)
    try {
      await userService.update(user.id, { avatar: '' })
      await refreshAuth()
      setAvatarPreview(null)
      showSuccessSimple('Profile picture removed!')
    } catch (error) {
      console.error('Remove error:', error)
      showErrorSimple(error.response?.data?.error || 'Failed to remove profile picture')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      await authService.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
      setPasswordSuccess('Password changed successfully!')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => {
        setShowPasswordModal(false)
        setPasswordSuccess('')
      }, 2000)
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const currentAvatar = avatarPreview || (user?.avatar ? user.avatar : getAvatarUrl(null, user?.first_name, user?.last_name))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Settings</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <img 
                  src={currentAvatar}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover bg-gray-200 dark:bg-slate-700 ring-4 ring-blue-100 dark:ring-blue-900"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-24 w-24 rounded-full bg-black/50 flex items-center justify-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarLoading}
                      className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                      title="Change photo"
                    >
                      <Camera className="h-5 w-5 text-gray-700" />
                    </button>
                    {(user?.avatar || avatarPreview) && (
                      <button
                        onClick={handleRemoveAvatar}
                        disabled={avatarLoading}
                        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                        title="Remove photo"
                      >
                        <X className="h-5 w-5 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
                {avatarLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{user?.first_name} {user?.last_name}</p>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                    {primaryRole}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{user?.email}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                  Click camera icon to change photo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>Dark Mode</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Switch between light and dark theme</p>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`w-12 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform flex items-center justify-center ${darkMode ? 'right-1' : 'left-1'}`}>
                  {darkMode ? (
                    <Moon className="h-3 w-3 text-blue-600" />
                  ) : (
                    <Sun className="h-3 w-3 text-yellow-500" />
                  )}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>Email Notifications</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Receive email for important updates</p>
              </div>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>Low Stock Alerts</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Get notified when stock is low</p>
              </div>
              <button className="w-12 h-6 bg-blue-600 rounded-full relative">
                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition" />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button 
              onClick={() => setShowPasswordModal(true)}
              className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors" 
              style={{ borderColor: 'var(--border)', backgroundColor: 'transparent' }}
            >
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Change Password</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Update your password</p>
            </button>
            <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors" style={{ borderColor: 'var(--border)', backgroundColor: 'transparent' }}>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Two-Factor Authentication</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Add an extra layer of security</p>
            </button>
          </CardContent>
        </Card>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Enter your current and new password</CardDescription>
              </div>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded" onClick={() => setShowPasswordModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 text-sm rounded-lg" style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 text-sm rounded-lg" style={{ color: '#16a34a', backgroundColor: '#f0fdf4' }}>
                    {passwordSuccess}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <PasswordInput
                    id="current_password"
                    placeholder="Enter current password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <PasswordInput
                    id="new_password"
                    placeholder="Enter new password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <PasswordInput
                    id="confirm_password"
                    placeholder="Confirm new password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
