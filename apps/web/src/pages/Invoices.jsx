import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { invoicesAPI, premisesAPI } from '../services/api'
import { formatCurrency, formatDate, getStatusColor } from '../lib/utils'
import { FileText, Search, Filter, Download, Edit, Trash2, Plus, Eye, Calendar, DollarSign } from 'lucide-react'

// Invoice Form Component
function InvoiceForm({ invoice, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    premiseId: invoice?.premiseId?._id || '',
    month: invoice?.month || new Date().getMonth() + 1,
    year: invoice?.year || new Date().getFullYear(),
    notes: invoice?.notes || ''
  })

  const queryClient = useQueryClient()

  const { data: premises } = useQuery({
    queryKey: ['premises'],
    queryFn: () => premisesAPI.getAll()
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Generate period from month and year
      const period = `${data.year}-${String(data.month).padStart(2, '0')}`
      
      // Use the single premise generation endpoint
      return invoicesAPI.generateSingle(data.premiseId, { period })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      onSuccess?.()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => invoicesAPI.update(invoice._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
      onSuccess?.()
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (invoice) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{invoice ? 'Edit Invoice' : 'Create Invoice'}</CardTitle>
          <CardDescription>
            {invoice ? 'Update invoice information' : 'Create a new invoice'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="premise">Premise</Label>
              <select
                id="premise"
                value={formData.premiseId}
                onChange={(e) => setFormData(prev => ({ ...prev, premiseId: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
              >
                <option value="">Select a premise</option>
                {premises?.data?.premises?.map(premise => (
                  <option key={premise._id} value={premise._id}>
                    {premise.unitNo} - {premise.buildingId?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <select
                  id="month"
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
                  className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
                  min="2020"
                  max="2030"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Invoice will be automatically generated with:
                <br />• Current water usage from meter readings
                <br />• Monthly rent from premise settings
                <br />• Previous balance and penalties
                <br />• Automatic calculations for all amounts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : (invoice ? 'Update' : 'Create')}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', { search: searchTerm, status: statusFilter }],
    queryFn: () => invoicesAPI.getAll({ 
      ...(searchTerm && { search: searchTerm }),
      ...(statusFilter && { status: statusFilter })
    })
  })

  const deleteMutation = useMutation({
    mutationFn: invoicesAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
    }
  })

  const generateMutation = useMutation({
    mutationFn: () => invoicesAPI.generate(),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices'])
    }
  })

  const handleDelete = (invoiceId) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteMutation.mutate(invoiceId)
    }
  }

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice)
    setShowForm(true)
  }

  const handleGenerate = () => {
    if (window.confirm('Generate invoices for all premises? This will create invoices for the current month.')) {
      generateMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading invoices: {error.message}</p>
      </div>
    )
  }

  const invoices = data?.data?.invoices || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage and track all invoices</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? 'Generating...' : 'Generate Invoices'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              No invoices found matching your criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {invoice.premiseId?.unitNo || 'Unknown Unit'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {invoice.buildingId?.name} • Period: {invoice.period}
                        </p>
                      </div>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div>
                        <p className="text-sm text-gray-500">Invoice Date</p>
                        <p className="text-sm font-medium">{formatDate(invoice.invoiceDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Due Date</p>
                        <p className="text-sm font-medium">{formatDate(invoice.dueDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Rent</p>
                        <p className="text-sm font-medium">{formatCurrency(invoice.rent_amount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Water</p>
                        <p className="text-sm font-medium">{formatCurrency(invoice.water_amount)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(invoice.total_amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Paid: {formatCurrency(invoice.amount_paid)}
                    </p>
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(invoice)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(invoice._id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <InvoiceForm
          invoice={editingInvoice}
          onClose={() => {
            setShowForm(false)
            setEditingInvoice(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingInvoice(null)
          }}
        />
      )}
    </div>
  )
}
