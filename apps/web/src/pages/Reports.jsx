import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { reportsAPI } from '../services/api'
import { BarChart3, Download, Calendar, DollarSign, TrendingUp, Users, FileText, CreditCard } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [selectedReport, setSelectedReport] = useState('overview')

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['reports', 'overview', dateRange],
    queryFn: () => reportsAPI.getOverview(dateRange)
  })

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports', 'revenue', dateRange],
    queryFn: () => reportsAPI.getRevenue(dateRange)
  })

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['reports', 'usage', dateRange],
    queryFn: () => reportsAPI.getUsage(dateRange)
  })

  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ['reports', 'payments', dateRange],
    queryFn: () => reportsAPI.getPayments(dateRange)
  })

  const handleExport = (reportType) => {
    // In a real app, this would trigger a download
    alert(`Exporting ${reportType} report...`)
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const renderOverview = () => {
    if (overviewLoading) return <div className="text-center py-8">Loading...</div>
    
    const data = overviewData?.data || {}
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency((data.totalRevenue || 0) * 100)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalPayments || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Premises</p>
                <p className="text-2xl font-bold text-gray-900">{data.activePremises || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderRevenueChart = () => {
    if (revenueLoading) return <div className="text-center py-8">Loading...</div>
    
    const data = revenueData?.data || []
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value * 100)} />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderUsageChart = () => {
    if (usageLoading) return <div className="text-center py-8">Loading...</div>
    
    const data = usageData?.data || []
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Water Usage</CardTitle>
          <CardDescription>Monthly water consumption by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="council" fill="#8884d8" name="Council Water" />
                <Bar dataKey="borehole" fill="#82ca9d" name="Borehole Water" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderPaymentMethods = () => {
    if (paymentLoading) return <div className="text-center py-8">Loading...</div>
    
    const data = paymentData?.data?.paymentMethods || []
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Distribution of payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">View analytics and reports</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExport(selectedReport)}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => window.location.reload()}>
                <Calendar className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Type Selector */}
      <div className="flex space-x-2">
        <Button
          variant={selectedReport === 'overview' ? 'default' : 'outline'}
          onClick={() => setSelectedReport('overview')}
        >
          Overview
        </Button>
        <Button
          variant={selectedReport === 'revenue' ? 'default' : 'outline'}
          onClick={() => setSelectedReport('revenue')}
        >
          Revenue
        </Button>
        <Button
          variant={selectedReport === 'usage' ? 'default' : 'outline'}
          onClick={() => setSelectedReport('usage')}
        >
          Usage
        </Button>
        <Button
          variant={selectedReport === 'payments' ? 'default' : 'outline'}
          onClick={() => setSelectedReport('payments')}
        >
          Payments
        </Button>
      </div>

      {/* Report Content */}
      {selectedReport === 'overview' && renderOverview()}
      {selectedReport === 'revenue' && renderRevenueChart()}
      {selectedReport === 'usage' && renderUsageChart()}
      {selectedReport === 'payments' && renderPaymentMethods()}

      {/* Additional Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Buildings</CardTitle>
            <CardDescription>Buildings with highest revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overviewData?.data?.topBuildings?.map((building, index) => (
                <div key={building._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <p className="font-medium">{building.name}</p>
                      <p className="text-sm text-gray-500">{building.address}</p>
                    </div>
                  </div>
                  <p className="font-medium text-green-600">
                    {formatCurrency(building.revenue * 100)}
                  </p>
                </div>
              )) || (
                <p className="text-center text-gray-500 py-4">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Invoices</CardTitle>
            <CardDescription>Invoices that are past due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overviewData?.data?.overdueInvoices?.map((invoice) => (
                <div key={invoice._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">#{invoice.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{invoice.premiseId?.unitNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      {formatCurrency(invoice.total_amount * 100)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))} days overdue
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-center text-gray-500 py-4">No overdue invoices</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}