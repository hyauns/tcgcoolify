import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Globe, Link as LinkIcon, Megaphone, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

interface SEOSettingsProps {
  data: {
    seoTitle: string
    seoDescription: string
    seoKeywords: string
    googleSiteVerification: string
    googleAdsConversionId: string
    googleAdsConversionLabel: string
  }
  onChange: (field: string, value: string) => void
}

export function SEOSettings({ data, onChange }: SEOSettingsProps) {
  const { toast } = useToast()
  const [baseUrl, setBaseUrl] = useState("")

  useEffect(() => {
    // Determine the base URL for the sitemap and robots links
    setBaseUrl(window.location.origin)
  }, [])

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} URL has been copied to your clipboard.`,
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
        duration: 2000,
      })
    }
  }

  // Basic SEO Validation flags
  const titleTooLong = data.seoTitle.length > 60
  const descTooLong = data.seoDescription.length > 160

  // Google Ads conversion ID must look like "AW-123456789"
  const conversionIdInvalid = data.googleAdsConversionId.length > 0 && !/^AW-\d{6,15}$/.test(data.googleAdsConversionId)

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Meta Data (Search Engines)
            </CardTitle>
            <CardDescription>
              Configure how your store appears on Google, Bing, and social media.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <span className={`text-xs ${titleTooLong ? "text-red-500 font-bold" : "text-gray-500"}`}>
                  {data.seoTitle.length} / 60
                </span>
              </div>
              <Input
                id="seoTitle"
                value={data.seoTitle}
                onChange={(e) => onChange("seoTitle", e.target.value)}
                placeholder="TCG Lore | Premium Trading Cards"
                className={titleTooLong ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {titleTooLong && <p className="text-xs text-red-500">Google typically truncates titles over 60 characters.</p>}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="seoDescription">Meta Description</Label>
                <span className={`text-xs ${descTooLong ? "text-red-500 font-bold" : "text-gray-500"}`}>
                  {data.seoDescription.length} / 160
                </span>
              </div>
              <Textarea
                id="seoDescription"
                value={data.seoDescription}
                onChange={(e) => onChange("seoDescription", e.target.value)}
                placeholder="Shop authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! cards..."
                rows={4}
                className={descTooLong ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {descTooLong && <p className="text-xs text-red-500">Keep description under 160 characters for best display on search results.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoKeywords">Focus Keywords</Label>
              <Input
                id="seoKeywords"
                value={data.seoKeywords}
                onChange={(e) => onChange("seoKeywords", e.target.value)}
                placeholder="trading cards, pokemon, mtg, yugioh"
              />
              <p className="text-xs text-gray-500">Separate multiple keywords with commas.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              Google Ads Conversion Tracking
            </CardTitle>
            <CardDescription>
              Paste the Conversion ID and label from your Google Ads conversion action. The tag is installed site-wide
              and the purchase conversion fires automatically on the order confirmation page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="googleAdsConversionId">Conversion ID (Tag)</Label>
              <Input
                id="googleAdsConversionId"
                value={data.googleAdsConversionId}
                onChange={(e) => onChange("googleAdsConversionId", e.target.value.trim())}
                placeholder="AW-123456789"
                className={conversionIdInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {conversionIdInvalid ? (
                <p className="text-xs text-red-500">Must start with &quot;AW-&quot; followed by digits, e.g. AW-123456789.</p>
              ) : (
                <p className="text-xs text-gray-500">In Google Ads: Goals → Conversions → your action → Tag setup. Looks like &quot;AW-123456789&quot;.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleAdsConversionLabel">Conversion Label</Label>
              <Input
                id="googleAdsConversionLabel"
                value={data.googleAdsConversionLabel}
                onChange={(e) => onChange("googleAdsConversionLabel", e.target.value.trim())}
                placeholder="AbC-D_efG-h12_34-567"
              />
              <p className="text-xs text-gray-500">
                The label shown after the slash in the event snippet&apos;s &quot;send_to&quot; value. Required to record
                purchase conversions; leave both fields blank to disable tracking.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="bg-slate-50 border-blue-100 h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Webmaster Tools
            </CardTitle>
            <CardDescription>
              Useful links for submitting your store to Google Search Console.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="googleSiteVerification" className="text-gray-700">Google Site Verification Code</Label>
              <Input
                id="googleSiteVerification"
                value={data.googleSiteVerification}
                onChange={(e) => onChange("googleSiteVerification", e.target.value)}
                placeholder="e.g. dQW3Vp_..."
              />
              <p className="text-xs text-gray-500">The content value of the verification meta tag from Google Search Console.</p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-gray-700">XML Sitemap</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border rounded-md px-3 py-2 text-sm text-gray-600 flex items-center overflow-x-auto whitespace-nowrap">
                  <LinkIcon className="h-3 w-3 mr-2 flex-shrink-0 text-gray-400" />
                  {baseUrl}/sitemap.xml
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => copyToClipboard(`${baseUrl}/sitemap.xml`, "Sitemap")}
                  title="Copy Sitemap URL"
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-gray-700">Robots.txt</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border rounded-md px-3 py-2 text-sm text-gray-600 flex items-center overflow-x-auto whitespace-nowrap">
                  <LinkIcon className="h-3 w-3 mr-2 flex-shrink-0 text-gray-400" />
                  {baseUrl}/robots.txt
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => copyToClipboard(`${baseUrl}/robots.txt`, "Robots.txt")}
                  title="Copy Robots.txt URL"
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm leading-relaxed mt-4 border border-blue-100">
              <strong>Tip:</strong> Copy these links and submit them to your Google Search Console to ensure your product pages are indexed quickly.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
