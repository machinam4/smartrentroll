import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { buildingsAPI } from '../services/api'
import { Building2, MapPin, Settings, Edit, Trash2, Plus, Search } from 'lucide-react'
import { formatCurrency } from '../lib/utils'

// Building Form Component
function BuildingForm({ building, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: building?.name || '',
    address: building?.address || '',
    timezone: building?.timezone || 'Africa/Nairobi',
    pumping_cost_per_month: building?.pumping_cost_per_month || 0
  })

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: buildingsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      onSuccess?.()
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => buildingsAPI.update(building._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
      onSuccess?.()
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (building) {
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
          <CardTitle>{building ? 'Edit Building' : 'Add Building'}</CardTitle>
          <CardDescription>
            {building ? 'Update building information' : 'Create a new building'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Building Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Africa/Nairobi">Africa/Nairobi</option>
                <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</option>
                <option value="Africa/Kampala">Africa/Kampala</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pumping_cost">Monthly Pumping Cost (KES)</Label>
              <Input
                id="pumping_cost"
                type="number"
                value={formData.pumping_cost_per_month}
                onChange={(e) => setFormData(prev => ({ ...prev, pumping_cost_per_month: Number(e.target.value) }))}
                min="0"
                required
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : (building ? 'Update' : 'Create')}
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

// Building Settings Component
function BuildingSettings({ building, onClose }) {
  const [settings, setSettings] = useState({
    council_price_per_m3: 60,
    borehole_price_per_m3: 30,
    pumping_cost_per_month: 5000,
    penalty_daily: 150,
    prorate_precision: 2
  })

  const queryClient = useQueryClient()

  const { data: currentSettings } = useQuery({
    queryKey: ['building-settings', building._id],
    queryFn: () => buildingsAPI.getSettings(building._id),
    onSuccess: (data) => {
      if (data?.data?.settings) {
        setSettings(data.data.settings)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => buildingsAPI.updateSettings(building._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['building-settings', building._id])
      onClose()
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(settings)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Building Settings</CardTitle>
          <CardDescription>Configure pricing and billing settings for {building.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="council_price">Council Water Price (KES/m³)</Label>
              <Input
                id="council_price"
                type="number"
                value={settings.council_price_per_m3}
                onChange={(e) => setSettings(prev => ({ ...prev, council_price_per_m3: Number(e.target.value) }))}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="borehole_price">Borehole Water Price (KES/m³)</Label>
              <Input
                id="borehole_price"
                type="number"
                value={settings.borehole_price_per_m3}
                onChange={(e) => setSettings(prev => ({ ...prev, borehole_price_per_m3: Number(e.target.value) }))}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="penalty_daily">Daily Penalty (KES)</Label>
              <Input
                id="penalty_daily"
                type="number"
                value={settings.penalty_daily}
                onChange={(e) => setSettings(prev => ({ ...prev, penalty_daily: Number(e.target.value) }))}
                min="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precision">Prorate Precision (decimal places)</Label>
              <Input
                id="precision"
                type="number"
                value={settings.prorate_precision}
                onChange={(e) => setSettings(prev => ({ ...prev, prorate_precision: Number(e.target.value) }))}
                min="0"
                max="4"
                required
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
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

export default function Buildings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [editingBuilding, setEditingBuilding] = useState(null)

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsAPI.getAll()
  })

  const deleteMutation = useMutation({
    mutationFn: buildingsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['buildings'])
    }
  })

  const handleDelete = (buildingId) => {
    if (window.confirm('Are you sure you want to delete this building? This action cannot be undone.')) {
      deleteMutation.mutate(buildingId)
    }
  }

  const handleEdit = (building) => {
    setEditingBuilding(building)
    setShowForm(true)
  }

  const handleSettings = (building) => {
    setSelectedBuilding(building)
    setShowSettings(true)
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
        <p className="text-red-600">Error loading buildings: {error.message}</p>
      </div>
    )
  }

  const buildings = data?.data?.buildings || []
  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buildings</h1>
          <p className="text-gray-600">Manage your buildings and properties</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Building
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search buildings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredBuildings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'No buildings found' : 'No buildings'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first building.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Building
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBuildings.map((building) => (
            <Card key={building._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{building.name}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleSettings(building)}
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(building)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(building._id)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{building.address}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Timezone:</span>
                    <Badge variant="outline">{building.timezone}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Pumping Cost:</span>
                    <span className="font-medium">{formatCurrency(building.pumping_cost_per_month * 100)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Premises:</span>
                    <span>{building.premises?.length || 0}</span>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleSettings(building)}
                  >
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Forms */}
      {showForm && (
        <BuildingForm
          building={editingBuilding}
          onClose={() => {
            setShowForm(false)
            setEditingBuilding(null)
          }}
          onSuccess={() => {
            setShowForm(false)
            setEditingBuilding(null)
          }}
        />
      )}

      {showSettings && selectedBuilding && (
        <BuildingSettings
          building={selectedBuilding}
          onClose={() => {
            setShowSettings(false)
            setSelectedBuilding(null)
          }}
        />
      )}
    </div>
  )
}
