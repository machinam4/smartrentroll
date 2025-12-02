import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { settingsAPI } from '../services/api'
import { Settings as SettingsIcon, Save, Bell, Shield, Database, Mail, Smartphone } from 'lucide-react'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    timezone: 'Africa/Nairobi',
    currency: 'KES',
    invoicePrefix: 'INV',
    receiptPrefix: 'RCP',
    autoGenerateInvoices: true,
    invoiceDueDays: 30,
    penaltyRate: 150,
    emailNotifications: true,
    smsNotifications: false,
    mpesaShortcode: '',
    mpesaPasskey: '',
    mpesaConsumerKey: '',
    mpesaConsumerSecret: ''
  })

  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get(),
    onSuccess: (data) => {
      if (data?.data?.settings) {
        setFormData(data.data.settings)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data) => settingsAPI.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      alert('Settings saved successfully!')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'billing', label: 'Billing', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Smartphone }
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Basic company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                value={formData.companyEmail}
                onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                placeholder="company@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Company Phone</Label>
              <Input
                id="companyPhone"
                value={formData.companyPhone}
                onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                placeholder="+254 700 000 000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Africa/Nairobi">Africa/Nairobi</option>
                <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam</option>
                <option value="Africa/Kampala">Africa/Kampala</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company Address</Label>
            <Input
              id="companyAddress"
              value={formData.companyAddress}
              onChange={(e) => handleInputChange('companyAddress', e.target.value)}
              placeholder="123 Main Street, City, Country"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderBillingSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Configuration</CardTitle>
          <CardDescription>Configure billing and invoice settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="KES">Kenyan Shilling (KES)</option>
                <option value="USD">US Dollar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDueDays">Invoice Due Days</Label>
              <Input
                id="invoiceDueDays"
                type="number"
                value={formData.invoiceDueDays}
                onChange={(e) => handleInputChange('invoiceDueDays', Number(e.target.value))}
                min="1"
                max="90"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
              <Input
                id="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={(e) => handleInputChange('invoicePrefix', e.target.value)}
                placeholder="INV"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptPrefix">Receipt Prefix</Label>
              <Input
                id="receiptPrefix"
                value={formData.receiptPrefix}
                onChange={(e) => handleInputChange('receiptPrefix', e.target.value)}
                placeholder="RCP"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="penaltyRate">Daily Penalty Rate (KES)</Label>
            <Input
              id="penaltyRate"
              type="number"
              value={formData.penaltyRate}
              onChange={(e) => handleInputChange('penaltyRate', Number(e.target.value))}
              min="0"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="autoGenerateInvoices"
              checked={formData.autoGenerateInvoices}
              onCheckedChange={(checked) => handleInputChange('autoGenerateInvoices', checked)}
            />
            <Label htmlFor="autoGenerateInvoices">Automatically generate invoices monthly</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">Receive notifications via email</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={formData.emailNotifications}
              onCheckedChange={(checked) => handleInputChange('emailNotifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smsNotifications">SMS Notifications</Label>
              <p className="text-sm text-gray-500">Receive notifications via SMS</p>
            </div>
            <Switch
              id="smsNotifications"
              checked={formData.smsNotifications}
              onCheckedChange={(checked) => handleInputChange('smsNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage security and access controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Password Policy</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Minimum 8 characters</Badge>
                <Badge variant="outline">Must contain numbers</Badge>
                <Badge variant="outline">Must contain special characters</Badge>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Session Management</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">Auto-logout after 24 hours</Badge>
                <Badge variant="outline">Require re-authentication for sensitive actions</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderIntegrationSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>MPesa Integration</CardTitle>
          <CardDescription>Configure MPesa payment integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mpesaShortcode">MPesa Shortcode</Label>
            <Input
              id="mpesaShortcode"
              value={formData.mpesaShortcode}
              onChange={(e) => handleInputChange('mpesaShortcode', e.target.value)}
              placeholder="123456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpesaPasskey">MPesa Passkey</Label>
            <Input
              id="mpesaPasskey"
              type="password"
              value={formData.mpesaPasskey}
              onChange={(e) => handleInputChange('mpesaPasskey', e.target.value)}
              placeholder="Your MPesa passkey"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpesaConsumerKey">Consumer Key</Label>
            <Input
              id="mpesaConsumerKey"
              value={formData.mpesaConsumerKey}
              onChange={(e) => handleInputChange('mpesaConsumerKey', e.target.value)}
              placeholder="Your consumer key"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mpesaConsumerSecret">Consumer Secret</Label>
            <Input
              id="mpesaConsumerSecret"
              type="password"
              value={formData.mpesaConsumerSecret}
              onChange={(e) => handleInputChange('mpesaConsumerSecret', e.target.value)}
              placeholder="Your consumer secret"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings()
      case 'billing':
        return renderBillingSettings()
      case 'notifications':
        return renderNotificationSettings()
      case 'security':
        return renderSecuritySettings()
      case 'integrations':
        return renderIntegrationSettings()
      default:
        return renderGeneralSettings()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage system settings and preferences</p>
        </div>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <form onSubmit={handleSubmit}>
        {renderTabContent()}
      </form>
    </div>
  )
}