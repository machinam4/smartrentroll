import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { invoicesAPI, paymentsAPI, buildingsAPI } from '../services/api'
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils'
import { 
  FileText, 
  CreditCard, 
  Building2, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

export default function Dashboard() {
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesAPI.getAll()
  })

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsAPI.getAll()
  })

  const { data: buildings, isLoading: buildingsLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsAPI.getAll()
  })

  const isLoading = invoicesLoading || paymentsLoading || buildingsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const invoiceData = invoices?.data?.invoices || []
  const paymentData = payments?.data?.payments || []
  const buildingData = buildings?.data?.buildings || []

  // Calculate stats
  const totalInvoices = invoiceData.length
  const unpaidInvoices = invoiceData.filter(inv => inv.status === 'unpaid').length
  const overdueInvoices = invoiceData.filter(inv => inv.status === 'overdue').length
  const totalRevenue = paymentData.reduce((sum, payment) => sum + payment.amount, 0)

  const stats = [
    {
      name: 'Total Invoices',
      value: totalInvoices,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      name: 'Unpaid Invoices',
      value: unpaidInvoices,
      icon: AlertTriangle,
      color: 'text-red-600'
    },
    {
      name: 'Overdue Invoices',
      value: overdueInvoices,
      icon: AlertTriangle,
      color: 'text-orange-600'
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your billing system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest invoices in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoiceData.slice(0, 5).map((invoice) => (
                <div key={invoice._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.premiseId?.unitNo || 'Unknown Unit'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.period} • {formatDate(invoice.invoiceDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest payments received</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentData.slice(0, 5).map((payment) => (
                <div key={payment._id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.premiseId?.unitNo || 'Unknown Unit'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(payment.paymentDate)} • {payment.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">Paid</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buildings Overview */}
      {buildingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Buildings</CardTitle>
            <CardDescription>Buildings in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buildingData.map((building) => (
                <div key={building._id} className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{building.name}</p>
                    <p className="text-sm text-gray-500">{building.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
