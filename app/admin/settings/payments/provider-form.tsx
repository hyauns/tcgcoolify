"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Save, Link2, KeyRound, Fingerprint } from "lucide-react"
import {
  saveGatewayProviderSettings,
  testGatewayConnection,
  type GatewayFlow,
  type GatewayCredentials,
} from "@/app/actions/settings"

import { useToast } from "@/hooks/use-toast"

interface ProviderFormData {
  flow: GatewayFlow
  credentials: { mock_charge: GatewayCredentials; stripe: GatewayCredentials }
}

export function ProviderForm({ initialData }: { initialData: ProviderFormData }) {
  const { toast } = useToast()
  // `flow` is BOTH the active flow and the credential set currently being
  // edited. Switching it reveals that flow's saved credentials; Save persists
  // both sets so edits to either are never lost.
  const [flow, setFlow] = useState<GatewayFlow>(initialData.flow)
  const [credentials, setCredentials] = useState(initialData.credentials)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const [showApi, setShowApi] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)

  const current = credentials[flow]

  const setField = (key: keyof GatewayCredentials, value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [flow]: { ...prev[flow], [key]: value },
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await saveGatewayProviderSettings({ flow, credentials })
      toast({
        title: "Settings Saved",
        description: `Saved both flows. Active mode: ${flow === "stripe" ? "Stripe Checkout" : "Mock Charge"}.`,
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "An error occurred while saving.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const res = await testGatewayConnection(current.baseUrl, current.storeId, current.apiKey)
      if (res.success) {
        toast({
          title: "Connection Successful",
          description: res.message,
          className: "bg-green-50 border-green-200 text-green-800",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: res.message,
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: err.message || "Unable to reach the gateway",
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Payment Mode — selects the active flow AND which credential set to edit */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Fingerprint className="w-4 h-4 mr-2 text-gray-400" />
          Payment Mode
        </label>
        <select
          value={flow}
          onChange={(e) => setFlow(e.target.value as GatewayFlow)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="mock_charge">Mock Charge — direct card (current)</option>
          <option value="stripe">Stripe Checkout — redirect</option>
        </select>
        <p className="text-xs text-gray-500">
          The credentials below belong to the selected mode. Each mode keeps its own
          Store ID / API Key / Webhook Secret — switch the dropdown to edit the other
          mode. Saving stores both sets and makes the selected mode active.
        </p>
      </div>

      <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-800">
        Editing credentials for: <strong>{flow === "stripe" ? "Stripe Checkout" : "Mock Charge"}</strong>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center">
          <Link2 className="w-4 h-4 mr-2 text-gray-400" />
          Gateway Base URL
        </label>
        <Input
          required
          placeholder="https://your-gateway.com"
          value={current.baseUrl}
          onChange={(e) => setField("baseUrl", e.target.value)}
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
          value={current.storeId}
          onChange={(e) => setField("storeId", e.target.value)}
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
              value={current.apiKey}
              onChange={(e) => setField("apiKey", e.target.value)}
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
            value={current.webhookSecret}
            onChange={(e) => setField("webhookSecret", e.target.value)}
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
