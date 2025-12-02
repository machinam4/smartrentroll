import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { paymentsAPI, invoicesAPI } from '../services/api'
import { CreditCard, Edit, Trash2, Plus, Search, Eye, Calendar, DollarSign, CheckCircle } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

// Payment Form Component
function PaymentForm({ payment, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    invoiceId: payment?.invoiceId?._id || '',
    amount: payment?.amount || 0,
    method: payment?.method || 'cash',
    reference: payment?.reference || '',
    notes: payment?.notes || '',
    date: payment?.date ? new Date(payment.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  })

  const queryClient = useQueryClient()

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesAPI.getAll()
  })

  const createMutation = useMutation({
    mutationFn: paymentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      queryClient.invalidateQueries(['invoices'])
      onSuccess?.()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => paymentsAPI.update(payment._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      queryClient.invalidateQueries(['invoices'])
      onSuccess?.()
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      amount: Number(formData.amount),
      date: new Date(formData.date)
    }
    
    if (payment) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{payment ? 'Edit Payment' : 'Record Payment'}</CardTitle>
          <CardDescription>
            {payment ? 'Update payment information' : 'Record a new payment'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice">Invoice</Label>
              <select
                id="invoice"
                value={formData.invoiceId}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceId: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
              >
                <option value="">Select an invoice</option>
                {invoices?.data?.invoices?.map(invoice => (
                  <option key={invoice._id} value={invoice._id}>
                    #{invoice.invoiceNumber} - {invoice.premiseId?.unitNo} - {formatCurrency(invoice.total_amount * 100)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <select
                id="method"
                value={formData.method}
                onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
              >
                <option value="cash">Cash</option>
                <option value="mpesa">MPesa</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Transaction ID, cheque number, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Payment Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
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
                {isLoading ? 'Saving...' : (payment ? 'Update' : 'Record')}
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

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [methodFilter, setMethodFilter] = useState('all')

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsAPI.getAll()
  })

  const deleteMutation = useMutation({
    mutationFn: paymentsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      queryClient.invalidateQueries(['invoices'])
    }
  })

  const handleDelete = (paymentId) => {
    if (window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      deleteMutation.mutate(paymentId)
    }
  }

  const handleEdit = (payment) => {
    setEditingPayment(payment)
    setShowForm(true)
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
        <p className="text-red-600">Error loading payments: {error.message}</p>
      </div>
    )
  }

  const payments = data?.data?.payments || []
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.invoiceId?.premiseId?.unitNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoiceId?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
    
    return matchesSearch && matchesMethod
  })

  const getMethodBadge = (method) => {
    const variants = {
      cash: 'default',
      mpesa: 'default',
      bank_transfer: 'secondary',
      cheque: 'outline'
    }
    return <Badge variant={variants[method] || 'outline'}>{method.replace('_', ' ')}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track and manage payments</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="mpesa">MPesa</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || methodFilter !== 'all' ? 'No payments found' : 'No payments'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || methodFilter !== 'all' 
                ? 'Try adjusting your search terms or filters.' 
                : 'Get started by recording your first payment.'}
            </p>
            {!searchTerm && methodFilter === 'all' && (
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPayments.map((payment) => (
            <Card key={payment._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">#{payment.receiptNumber}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(payment)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(payment._id)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(payment.date).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Invoice:</span>
                    <span className="font-medium">#{payment.invoiceId?.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Premise:</span>
                    <span>{payment.invoiceId?.premiseId?.unitNo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(payment.amount * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Method:</span>
                    {getMethodBadge(payment.method)}
                  </div>
                  {payment.reference && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Reference:</span>
                      <span className="font-mono text-xs">{payment.reference}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Receipt
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <PaymentForm
          payment={editingPayment}
          onClose={() => {
            setShowForm(false)
            setEditingPayment(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingPayment(null)
          }}
        />
      )}
    </div>
  )
}