"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Save, Link2, KeyRound, Fingerprint } from "lucide-react"
import { saveGatewayProviderSettings, testGatewayConnection, type GatewayFlow } from "@/app/actions/settings"

import { useToast } from "@/hooks/use-toast"

interface ProviderSettings {
  baseUrl: string
  storeId: string
  apiKey: string
  webhookSecret: string
  flow: GatewayFlow
}

export function ProviderForm({ initialData }: { initialData: ProviderSettings }) {
  const { toast } = useToast()
  const [data, setData] = useState(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  
  const [showApi, setShowApi] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await saveGatewayProviderSettings(data.baseUrl, data.storeId, data.apiKey, data.webhookSecret, data.flow)
      toast({
        title: "Settings Saved",
        description: "Payment Provider config updated successfully."
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "An error occurred while saving."
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const res = await testGatewayConnection(data.baseUrl, data.storeId, data.apiKey)
      if (res.success) {
        toast({
          title: "Connection Successful",
          description: res.message,
          className: "bg-green-50 border-green-200 text-green-800"
        })
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: res.message
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: err.message || "Unable to reach the gateway"
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Payment Mode — selects which gateway flow this storefront uses */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Fingerprint className="w-4 h-4 mr-2 text-gray-400" />
          Payment Mode
        </label>
        <select
          value={data.flow}
          onChange={e => setData({ ...data, flow: e.target.value as GatewayFlow })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="mock_charge">Mock Charge — direct card (current)</option>
          <option value="stripe">Stripe Checkout — redirect</option>
        </select>
        <p className="text-xs text-gray-500">
          {data.flow === "stripe"
            ? "Stripe: the customer is redirected to a secure hosted page. No card data is collected on this storefront. Point Store ID / API Key / Webhook Secret to your Stripe-provider store."
            : "Mock Charge: the storefront collects the card and charges directly (unchanged). Use for testing."}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Link2 className="w-4 h-4 mr-2 text-gray-400" />
          Gateway Base URL
        </label>
        <Input 
          required 
          placeholder="https://your-gateway.com" 
          value={data.baseUrl}
          onChange={e => setData({...data, baseUrl: e.target.value})}
        />
        <p className="text-xs text-gray-500">The root URL assigned to your Payment Gateway.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Fingerprint className="w-4 h-4 mr-2 text-gray-400" />
          Gateway Store ID
        </label>
        <Input 
          required 
          placeholder="store_xyz..." 
          value={data.storeId}
          onChange={e => setData({...data, storeId: e.target.value})}
        />
        <p className="text-xs text-gray-500">The unique identifier for your storefront given by the gateway.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <KeyRound className="w-4 h-4 mr-2 text-gray-400" />
          Merchant API Key
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input 
              required
              type={showApi ? "text" : "password"} 
              placeholder="pk_live_..." 
              value={data.apiKey}
              onChange={e => setData({...data, apiKey: e.target.value})}
              className="pr-10 font-mono text-sm"
            />
            <button 
              type="button" 
              onClick={() => setShowApi(!showApi)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button type="button" variant="secondary" onClick={handleTest} disabled={isTesting}>
            {isTesting ? "Pinging..." : "Test Connection"}
          </Button>
        </div>
        <p className="text-xs text-gray-500">Private key used in the X-API-Key header to authenticate outbound calls to the gateway.</p>
      </div>

      <div className="space-y-1.5 pt-2">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Fingerprint className="w-4 h-4 mr-2 text-gray-400" />
          Webhook Secret (HMAC)
        </label>
        <div className="relative max-w-md">
          <Input 
            required
            type={showWebhook ? "text" : "password"} 
            placeholder="whsec_..." 
            value={data.webhookSecret}
            onChange={e => setData({...data, webhookSecret: e.target.value})}
            className="pr-10 font-mono text-sm"
          />
          <button 
            type="button" 
            onClick={() => setShowWebhook(!showWebhook)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500">Used strictly by your storefront to cryptographically verify incoming webhook signatures.</p>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  )
}
