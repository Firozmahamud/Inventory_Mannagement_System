import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

export default function Orders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>Manage purchase and sales orders</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Purchase Orders</CardTitle></CardHeader>
        <CardContent>
          <p style={{ color: 'var(--muted-foreground)' }}>Purchase orders management coming soon...</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Sales Orders</CardTitle></CardHeader>
        <CardContent>
          <p style={{ color: 'var(--muted-foreground)' }}>Sales orders management coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}