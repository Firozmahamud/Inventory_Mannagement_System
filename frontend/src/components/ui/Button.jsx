import { cn } from '../../lib/utils'

export function Button({ className, variant = 'default', size = 'default', ...props }) {
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
    outline: 'border bg-white text-gray-700 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700',
    ghost: 'text-gray-700 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800',
    destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
  }

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    default: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
    icon: 'h-10 w-10',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}