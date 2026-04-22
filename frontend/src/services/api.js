import axios from 'axios'

const API_URL = '/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          localStorage.setItem('token', data.token)
          localStorage.setItem('refreshToken', data.refresh_token)
          originalRequest.headers.Authorization = `Bearer ${data.token}`
          return api(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
}

export const userService = {
  getAll: (params = {}) => api.get('/users', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateRoles: (userId, roleIds) => api.put(`/users/${userId}/roles`, { role_ids: roleIds }),
}

export const categoryService = {
  getAll: (params = {}) => api.get('/categories', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

export const productService = {
  getAll: (params = {}) => api.get('/products', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
}

export const supplierService = {
  getAll: (params = {}) => api.get('/suppliers', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
}

export const warehouseService = {
  getAll: (params = {}) => api.get('/warehouses', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
}

export const inventoryService = {
  getAll: (params = {}) => api.get('/inventory', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  assignLocation: (data) => api.post('/inventory/assign-location', data),
  move: (data) => api.post('/inventory/move', data),
}

export const locationService = {
  getAll: (params = {}) => api.get('/locations', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/locations/${id}`),
  create: (data) => api.post('/locations', data),
  update: (id, data) => api.put(`/locations/${id}`, data),
  delete: (id) => api.delete(`/locations/${id}`),
  getByWarehouse: (warehouseId) => api.get(`/locations/warehouse/${warehouseId}`),
  getContents: (locationId) => api.get(`/locations/${locationId}/contents`),
  suggest: (params) => api.get('/locations/suggest', { params }),
}

export const orderService = {
  getAll: (params = {}) => api.get('/orders', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
}

export const stockService = {
  getTransactions: (params = {}) => api.get('/stock/transactions', { params: { limit: 10000, ...params } }),
  stockIn: (data) => api.post('/stock/in', data),
  stockOut: (data) => api.post('/stock/out', data),
  transfer: (data) => api.post('/stock/transfer', data),
  adjustment: (data) => api.post('/stock/adjustment', data),
}

export const roleService = {
  getAll: (params = {}) => api.get('/roles', { params: { limit: 10000, ...params } }),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
  assignPermissions: (roleId, permissionIds) => 
    api.post(`/roles/${roleId}/permissions`, { permission_ids: permissionIds }),
}

export const permissionService = {
  getAll: () => api.get('/permissions'),
}

export const userRoleService = {
  getByUser: (userId) => api.get(`/user-roles/${userId}`),
  assign: (data) => api.post('/user-roles', data),
  remove: (data) => api.delete('/user-roles', { data }),
}

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getSalesChart: () => api.get('/dashboard/charts/sales'),
  getStockChart: () => api.get('/dashboard/charts/stock'),
}

export default api
