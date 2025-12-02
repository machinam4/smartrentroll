import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Calendar, 
  Droplets, 
  Building,
  Home,
  Clock
} from 'lucide-react'
import { readingsAPI, metersAPI, buildingsAPI } from '../services/api'

// Meter Reading Form Component
function MeterReadingForm({ meter, period, onClose, onSuccess, existingReading = null }) {
  const [formData, setFormData] = useState({
    reading: existingReading?.reading?.toString() || '',
    readingDate: existingReading?.readingDate ? new Date(existingReading.readingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: existingReading?.notes || ''
  })

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data) => readingsAPI.create({
      meterId: meter._id,
      buildingId: meter.buildingId._id || meter.buildingId,
      premiseId: meter.premiseId?._id || meter.premiseId,
      period,
      reading: Number(data.reading),
      readingDate: new Date(data.readingDate).toISOString(),
      createdBy: 'current-user', // This will be overridden by the API with req.user._id
      notes: data.notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['meter-readings'])
      queryClient.invalidateQueries(['meters'])
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      console.error('Error creating meter reading:', error)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => readingsAPI.update(existingReading._id, {
      reading: Number(data.reading),
      readingDate: new Date(data.readingDate).toISOString(),
      notes: data.notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['meter-readings'])
      queryClient.invalidateQueries(['meters'])
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      console.error('Error updating meter reading:', error)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (existingReading) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const currentError = createMutation.error || updateMutation.error

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{existingReading ? 'Update Meter Reading' : 'Record Meter Reading'}</CardTitle>
          <CardDescription>
            {meter.label} - {meter.type} meter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                value={period}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reading">Current Reading ({meter.unit})</Label>
              <Input
                id="reading"
                type="number"
                value={formData.reading}
                onChange={(e) => setFormData(prev => ({ ...prev, reading: e.target.value }))}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="readingDate">Reading Date</Label>
              <Input
                id="readingDate"
                type="date"
                value={formData.readingDate}
                onChange={(e) => setFormData(prev => ({ ...prev, readingDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
              />
            </div>

            {currentError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  Error: {currentError.response?.data?.error || currentError.message}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading 
                  ? (existingReading ? 'Updating...' : 'Recording...') 
                  : (existingReading ? 'Update Reading' : 'Record Reading')
                }
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// Main Meter Readings Page
export default function MeterReadings() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedMeter, setSelectedMeter] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const queryClient = useQueryClient()

  // Get current period (YYYY-MM format)
  const currentPeriod = new Date().toISOString().slice(0, 7)

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsAPI.getAll()
  })

  const { data: meters, isLoading: metersLoading, error: metersError } = useQuery({
    queryKey: ['meters', selectedBuilding],
    queryFn: () => metersAPI.getAll(selectedBuilding ? { buildingId: selectedBuilding } : {}),
    enabled: true // Always enabled, will show all meters if no building selected
  })

  const { data: meterReadings } = useQuery({
    queryKey: ['meter-readings', selectedPeriod, selectedBuilding],
    queryFn: () => readingsAPI.getAll({ 
      period: selectedPeriod || currentPeriod,
      buildingId: selectedBuilding 
    }),
    enabled: true // Always enabled to show last readings
  })

  const handleRecordReading = (meter) => {
    setSelectedMeter(meter)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelectedMeter(null)
  }

  const filteredMeters = meters?.data?.meters?.filter(meter => {
    const matchesSearch = meter.label.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBuilding = !selectedBuilding || meter.buildingId._id?.toString() === selectedBuilding || meter.buildingId?.toString() === selectedBuilding
    return matchesSearch && matchesBuilding
  }) || []

  const getLastReading = (meterId) => {
    return meterReadings?.data?.readings?.find(reading => 
      reading.meterId === meterId || 
      reading.meterId?._id?.toString() === meterId ||
      reading.meterId?.toString() === meterId
    )
  }

  const calculateUsage = (meterId) => {
    const lastReading = getLastReading(meterId)
    if (!lastReading) return null
    
    // This would need to be calculated based on previous period's reading
    // For now, we'll show the current reading
    return lastReading.reading
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meter Readings</h1>
          <p className="text-muted-foreground">
            Record and manage water meter readings for billing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Meters</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by meter label..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="building">Building</Label>
              <select
                id="building"
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="">All Buildings</option>
                {buildings?.data?.buildings?.map(building => (
                  <option key={building._id} value={building._id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Input
                id="period"
                type="month"
                value={selectedPeriod || currentPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setSelectedBuilding('')
                  setSelectedPeriod('')
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div>Selected Building: {selectedBuilding || 'None'}</div>
              <div>Meters Loading: {metersLoading ? 'Yes' : 'No'}</div>
              <div>Meters Error: {metersError ? metersError.message : 'None'}</div>
              <div>Total Meters: {meters?.data?.meters?.length || 0}</div>
              <div>Filtered Meters: {filteredMeters.length}</div>
              <div>Total Readings: {meterReadings?.data?.readings?.length || 0}</div>
              <div>Sample Meter Building IDs:</div>
              {meters?.data?.meters?.slice(0, 3).map((meter, i) => (
                <div key={i} className="ml-2">
                  {meter.label}: {meter.buildingId?._id?.toString() || meter.buildingId?.toString() || 'No ID'}
                </div>
              ))}
              <div>Sample Readings:</div>
              {meterReadings?.data?.readings?.slice(0, 3).map((reading, i) => (
                <div key={i} className="ml-2">
                  Meter: {reading.meterId?.toString() || 'No ID'} - Reading: {reading.reading}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meters List */}
      <div className="grid gap-4">
        {filteredMeters.map(meter => {
          const lastReading = getLastReading(meter._id)
          const usage = calculateUsage(meter._id)
          
          return (
            <Card key={meter._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Droplets className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{meter.label}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building className="h-4 w-4" />
                        {meter.buildingId?.name || 'Unknown Building'}
                        <Badge variant="secondary">{meter.type}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Last Reading</div>
                    <div className="text-lg font-semibold">
                      {lastReading ? `${lastReading.reading} ${meter.unit}` : 'No reading'}
                    </div>
                    {lastReading && (
                      <div className="text-xs text-muted-foreground">
                        {formatDate(lastReading.readingDate)}
                      </div>
                    )}
                    {lastReading && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Reading exists
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRecordReading(meter)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {lastReading ? 'Update Reading' : 'Record Reading'}
                    </Button>
                  </div>
                </div>

                {usage !== null && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current Usage:</span>
                      <span className="font-medium">{usage} {meter.unit}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredMeters.length === 0 && !metersLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No meters found</h3>
            <p className="text-muted-foreground">
              {selectedBuilding 
                ? `No meters found for the selected building. Total meters in system: ${meters?.data?.meters?.length || 0}`
                : `Select a building to view its meters. Total meters in system: ${meters?.data?.meters?.length || 0}`
              }
            </p>
            {metersError && (
              <p className="text-red-500 text-sm mt-2">
                Error: {metersError.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && selectedMeter && (
        <MeterReadingForm
          meter={selectedMeter}
          period={selectedPeriod || currentPeriod}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
          existingReading={getLastReading(selectedMeter._id)}
        />
      )}
    </div>
  )
}
