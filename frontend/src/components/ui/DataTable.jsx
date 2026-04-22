import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, 
  Table2, Settings2, Download, ArrowUpDown, ArrowUp, ArrowDown,
  Check, X, Search
} from 'lucide-react'
import { Button } from './Button'

export function DataTable({ 
  columns = [], 
  data = [], 
  loading = false, 
  currentPage = 1, 
  totalPages = 1, 
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  storageKey,
  exportable = false,
  selectable = false,
  onSelectionChange,
  onExport,
  searchable = true
}) {
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`table_hidden_${storageKey}`)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          return {}
        }
      }
    }
    return {}
  })
  const [columnWidths, setColumnWidths] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  const resizingRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(`table_hidden_${storageKey}`, JSON.stringify(hiddenColumns))
    }
  }, [hiddenColumns, storageKey])

  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return data
    
    const query = searchQuery.toLowerCase()
    return data.filter(row => {
      return columns.some(col => {
        const value = row[col.accessor || col.key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(query)
      })
    })
  }, [data, searchQuery, searchable, columns])

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr)
      }
      return bStr.localeCompare(aStr)
    })
  }, [filteredData, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  const clearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  const handleMouseDown = useCallback((e, colKey) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = colKey
    startXRef.current = e.clientX
    startWidthRef.current = columnWidths[colKey] || 150
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [columnWidths])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingRef.current) return
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(60, startWidthRef.current + diff)
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current]: newWidth
      }))
    }

    const handleMouseUp = () => {
      resizingRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const toggleColumnVisibility = (key) => {
    setHiddenColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const displayColumns = columns.filter(col => !hiddenColumns[col.key])

  const startSerial = (currentPage - 1) * itemsPerPage + 1
  const endSerial = Math.min(currentPage * itemsPerPage, totalItems)

  const toggleSelectAll = () => {
    if (selectedRows.size === sortedData.length) {
      setSelectedRows(new Set())
      onSelectionChange?.([])
    } else {
      const newSelection = new Set(sortedData.map(row => row.id))
      setSelectedRows(newSelection)
      onSelectionChange?.(sortedData)
    }
  }

  const toggleRowSelection = (id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      onSelectionChange?.(sortedData.filter(row => newSet.has(row.id)))
      return newSet
    })
  }

  const getCellContent = (col, value, row) => {
    if (col.render) {
      return col.render(value, row)
    }
    return value !== undefined && value !== null ? String(value) : '-'
  }

  const isComplexContent = (content) => {
    if (!content) return false
    return typeof content === 'object' || (typeof content === 'string' && content.startsWith('<'))
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3 w-3 opacity-30" />
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-blue-500" />
      : <ArrowDown className="h-3 w-3 text-blue-500" />
  }

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden" style={{ 
      borderColor: 'var(--border)', 
      backgroundColor: 'var(--card)'
    }}>
      <div className="px-3 py-2 border-b flex flex-wrap items-center justify-between gap-3" style={{ 
        borderColor: 'var(--border)',
        backgroundColor: 'var(--muted)/50'
      }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {searchable && (
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 opacity-40" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-8 py-1.5 text-sm rounded-md border outline-none transition-all"
                style={{ 
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                >
                  <X className="h-3.5 w-3.5 opacity-50" />
                </button>
              )}
            </div>
          )}
          <span className="text-sm whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
            {totalItems} records
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {selectable && selectedRows.size > 0 && (
            <span className="text-xs px-2 py-1 rounded whitespace-nowrap" style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6'
            }}>
              {selectedRows.size} selected
            </span>
          )}
          
          {exportable && (
            <button
              onClick={onExport}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title="Export"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className="p-1.5 rounded transition-colors"
            style={{ 
              backgroundColor: showColumnSettings ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: showColumnSettings ? '#3b82f6' : 'var(--foreground)'
            }}
            title="Columns"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showColumnSettings && (
        <div className="px-4 py-2 border-b bg-gray-50/50 dark:bg-slate-800/50" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap gap-1.5">
            {columns.map(col => (
              <button
                key={col.key}
                onClick={() => toggleColumnVisibility(col.key)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-all"
                style={{ 
                  border: '1px solid',
                  borderColor: hiddenColumns[col.key] ? 'var(--border)' : 'rgba(59, 130, 246, 0.3)',
                  backgroundColor: hiddenColumns[col.key] ? 'transparent' : 'rgba(59, 130, 246, 0.08)',
                  color: hiddenColumns[col.key] ? 'var(--muted-foreground)' : 'var(--foreground)'
                }}
              >
                {hiddenColumns[col.key] ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Check className="h-3 w-3 text-blue-500" />
                )}
                {col.header}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--muted)' }}>
              {selectable && (
                <th 
                  className="px-3 py-2 w-10" 
                  style={{ 
                    borderBottom: '1px solid var(--border)', 
                    position: 'sticky', 
                    left: 0, 
                    backgroundColor: 'var(--muted)', 
                    zIndex: 10
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedData.length && sortedData.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
              )}
              <th 
                className="px-3 py-2 w-12 text-center font-medium text-xs" 
                style={{ 
                  color: 'var(--muted-foreground)', 
                  borderBottom: '1px solid var(--border)', 
                  position: 'sticky', 
                  left: selectable ? 40 : 0, 
                  backgroundColor: 'var(--muted)', 
                  zIndex: 10
                }}
              >
                #
              </th>
              {displayColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => !col.noDrag && col.sortable !== false && handleSort(col.accessor || col.key)}
                  className="px-3 py-2 font-medium text-xs group"
                  style={{ 
                    color: 'var(--muted-foreground)',
                    textAlign: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
                    borderBottom: '1px solid var(--border)',
                    width: columnWidths[col.key] || col.width || 120,
                    minWidth: 80,
                    cursor: col.noDrag ? 'default' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div className={`flex items-center gap-1.5 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    {col.sortable !== false && !col.noDrag && getSortIcon(col.accessor || col.key)}
                    <span className="uppercase tracking-wide">{col.header}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={displayColumns.length + (selectable ? 2 : 1)} className="text-center py-12">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length + (selectable ? 2 : 1)} className="text-center py-12">
                  <Table2 className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    {searchQuery ? 'No results found' : 'No data available'}
                  </p>
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => (
                <tr 
                  key={row.id || rowIndex}
                  className="transition-colors"
                  style={{ 
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: selectedRows.has(row.id) ? 'rgba(59, 130, 246, 0.06)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedRows.has(row.id)) {
                      e.currentTarget.style.backgroundColor = 'var(--muted)/30'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedRows.has(row.id)) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {selectable && (
                    <td 
                      className="px-3 py-2" 
                      style={{ 
                        position: 'sticky', 
                        left: 0, 
                        backgroundColor: 'inherit', 
                        zIndex: 5 
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                  )}
                  <td 
                    className="px-3 py-2 text-center" 
                    style={{ 
                      borderRight: '1px solid var(--border)', 
                      position: 'sticky', 
                      left: selectable ? 40 : 0, 
                      backgroundColor: 'inherit', 
                      zIndex: 5 
                    }}
                  >
                    <span 
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium" 
                      style={{ 
                        backgroundColor: 'var(--muted)',
                        color: 'var(--muted-foreground)',
                        fontSize: '10px'
                      }}
                    >
                      {startSerial + rowIndex}
                    </span>
                  </td>
                  {displayColumns.map((col) => {
                    const value = row[col.accessor || col.key]
                    const content = getCellContent(col, value, row)
                    const isComplex = isComplexContent(content)
                    
                    return (
                      <td 
                        key={col.key} 
                        className="px-3 py-2"
                        style={{ 
                          color: 'var(--foreground)',
                          textAlign: col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isComplex ? content : (
                          <span className="block truncate max-w-xs" title={String(content)}>
                            {content}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t flex items-center justify-between" style={{ 
        borderColor: 'var(--border)',
        backgroundColor: 'var(--muted)/30' 
      }}>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          Showing <span className="font-medium" style={{ color: 'var(--foreground)' }}>{totalItems > 0 ? startSerial : 0}</span> to <span className="font-medium" style={{ color: 'var(--foreground)' }}>{endSerial}</span> of <span className="font-medium" style={{ color: 'var(--foreground)' }}>{totalItems}</span>
        </span>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange?.(1)}
            disabled={currentPage === 1 || totalPages <= 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'var(--foreground)' }}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1 || totalPages <= 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'var(--foreground)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="px-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {currentPage} / {totalPages || 1}
          </span>
          
          <button
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="p-1.5 rounded transition-colors"
            style={{ 
              color: '#3b82f6',
              backgroundColor: currentPage < totalPages ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              opacity: currentPage >= totalPages ? 0.4 : 1
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange?.(totalPages)}
            disabled={currentPage >= totalPages || totalPages <= 1}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: 'var(--foreground)' }}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
