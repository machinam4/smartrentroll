import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { premisesAPI, buildingsAPI } from '../services/api'
import { Users, Edit, Trash2, Plus, Search, Home, Building2 } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

// Premise Form Component
function PremiseForm({ premise, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    buildingId: premise?.buildingId?._id || '',
    unitNo: premise?.unitNo || '',
    type: premise?.type || 'apartment',
    monthly_rent: premise?.monthly_rent || 0,
    disconnect_after_day_of_month: premise?.disconnect_after_day_of_month || 20,
    previous_balance: premise?.previous_balance || 0,
    tags: premise?.tags?.join(', ') || ''
  })

  const queryClient = useQueryClient()

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsAPI.getAll()
  })

  const createMutation = useMutation({
    mutationFn: premisesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['premises'])
      onSuccess?.()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => premisesAPI.update(premise._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['premises'])
      onSuccess?.()
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const submitData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }
    
    if (premise) {
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
          <CardTitle>{premise ? 'Edit Premise' : 'Add Premise'}</CardTitle>
          <CardDescription>
            {premise ? 'Update premise information' : 'Create a new premise'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="building">Building</Label>
              <select
                id="building"
                value={formData.buildingId}
                onChange={(e) => setFormData(prev => ({ ...prev, buildingId: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
              >
                <option value="">Select a building</option>
                {buildings?.data?.buildings?.map(building => (
                  <option key={building._id} value={building._id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitNo">Unit Number</Label>
              <Input
                id="unitNo"
                value={formData.unitNo}
                onChange={(e) => setFormData(prev => ({ ...prev, unitNo: e.target.value }))}
                placeholder="e.g., Shop 1, Apartment 2A"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
              >
                <option value="apartment">Apartment</option>
                <option value="shop">Shop</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_rent">Monthly Rent (KES)</Label>
              <Input
                id="monthly_rent"
                type="number"
                value={formData.monthly_rent}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_rent: Number(e.target.value) }))}
                min="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disconnect_day">Disconnect After Day</Label>
              <Input
                id="disconnect_day"
                type="number"
                value={formData.disconnect_after_day_of_month}
                onChange={(e) => setFormData(prev => ({ ...prev, disconnect_after_day_of_month: Number(e.target.value) }))}
                min="1"
                max="31"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previous_balance">Previous Balance (KES)</Label>
              <Input
                id="previous_balance"
                type="number"
                value={formData.previous_balance}
                onChange={(e) => setFormData(prev => ({ ...prev, previous_balance: Number(e.target.value) }))}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="e.g., ground, shop, corner"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : (premise ? 'Update' : 'Create')}
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

export default function Premises() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingPremise, setEditingPremise] = useState(null)

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['premises'],
    queryFn: () => premisesAPI.getAll()
  })

  const deleteMutation = useMutation({
    mutationFn: premisesAPI.update, // We'll use update to mark as deleted
    onSuccess: () => {
      queryClient.invalidateQueries(['premises'])
    }
  })

  const handleDelete = (premiseId) => {
    if (window.confirm('Are you sure you want to delete this premise? This action cannot be undone.')) {
      // In a real app, you'd have a proper delete endpoint
      // For now, we'll just show a message
      alert('Delete functionality would be implemented here')
    }
  }

  const handleEdit = (premise) => {
    setEditingPremise(premise)
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
        <p className="text-red-600">Error loading premises: {error.message}</p>
      </div>
    )
  }

  const premises = data?.data?.premises || []
  const filteredPremises = premises.filter(premise =>
    premise.unitNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    premise.buildingId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    premise.type.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Premises</h1>
          <p className="text-gray-600">Manage premises and units</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Premise
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search premises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredPremises.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'No premises found' : 'No premises'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first premise.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Premise
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPremises.map((premise) => (
            <Card key={premise._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {premise.type === 'shop' ? (
                      <Building2 className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Home className="h-5 w-5 text-blue-600" />
                    )}
                    <CardTitle className="text-lg">{premise.unitNo}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(premise)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(premise._id)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center space-x-1">
                  <Building2 className="h-4 w-4" />
                  <span>{premise.buildingId?.name || 'Unknown Building'}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type:</span>
                    <Badge variant={premise.type === 'shop' ? 'default' : 'secondary'}>
                      {premise.type}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Monthly Rent:</span>
                    <span className="font-medium">{formatCurrency(premise.monthly_rent * 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Previous Balance:</span>
                    <span className={premise.previous_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(premise.previous_balance * 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Disconnect After:</span>
                    <span>{premise.disconnect_after_day_of_month}th</span>
                  </div>
                  {premise.tags && premise.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {premise.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    View Invoices
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <PremiseForm
          premise={editingPremise}
          onClose={() => {
            setShowForm(false)
            setEditingPremise(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingPremise(null)
          }}
        />
      )}
    </div>
  )
}
