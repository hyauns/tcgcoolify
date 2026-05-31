"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { HeroSettings } from "./components/HeroSettings"
import { SEOSettings } from "./components/SEOSettings"
import { BrandingSettings } from "./components/BrandingSettings"
import { Save, Loader2 } from "lucide-react"

enum Tab {
  HERO = "hero",
  BRANDING = "branding",
  SEO = "seo"
}

export default function SettingsPage() {
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState<string>(Tab.HERO)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl: "",
    logoUrl: "",
    faviconUrl: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    googleSiteVerification: "",
    googleAdsConversionId: "",
    googleAdsConversionLabel: "",
    socialFacebook: "",
    socialInstagram: "",
    socialPinterest: "",
    socialTwitter: "",
    socialYoutube: "",
  })

  // File objects for "pending" uploads
  const [pendingFiles, setPendingFiles] = useState<{
    heroImage: File | null;
    logo: File | null;
    favicon: File | null;
  }>({
    heroImage: null,
    logo: null,
    favicon: null,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings")
      if (res.ok) {
        const data = await res.json()
        setFormData({
          heroTitle: data.heroTitle || "",
          heroSubtitle: data.heroSubtitle || "",
          heroImageUrl: data.heroImageUrl || "",
          logoUrl: data.logoUrl || "",
          faviconUrl: data.faviconUrl || "",
          seoTitle: data.seoTitle || "",
          seoDescription: data.seoDescription || "",
          seoKeywords: data.seoKeywords || "",
          googleSiteVerification: data.googleSiteVerification || "",
          googleAdsConversionId: data.googleAdsConversionId || "",
          googleAdsConversionLabel: data.googleAdsConversionLabel || "",
          socialFacebook: data.socialFacebook || "",
          socialInstagram: data.socialInstagram || "",
          socialPinterest: data.socialPinterest || "",
          socialTwitter: data.socialTwitter || "",
          socialYoutube: data.socialYoutube || "",
        })
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field: keyof typeof pendingFiles, file: File | null) => {
    setPendingFiles((prev) => ({ ...prev, [field]: file }))
  }

  const uploadFile = async (file: File): Promise<string> => {
    const res = await fetch(`/api/admin/upload?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: file,
    })
    
    if (!res.ok) {
      throw new Error(`Failed to upload ${file.name}`)
    }
    
    const blob = await res.json()
    return blob.url
  }

  const handleSave = async () => {
    // Basic validations
    if (activeTab === Tab.SEO && formData.seoTitle && !formData.seoDescription) {
      // Allow saving but maybe warn, anyway basic is fine. Let's just enforce basic length
    }

    setIsSaving(true)
    
    try {
      const updatedData = { ...formData }

      // 1. Upload Pending Files
      if (pendingFiles.heroImage) {
        updatedData.heroImageUrl = await uploadFile(pendingFiles.heroImage)
      }
      if (pendingFiles.logo) {
        updatedData.logoUrl = await uploadFile(pendingFiles.logo)
      }
      if (pendingFiles.favicon) {
        updatedData.faviconUrl = await uploadFile(pendingFiles.favicon)
      }

      // 2. Transmit to Settings API
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      })

      if (!res.ok) throw new Error("Failed to save settings")

      const savedData = await res.json()
      setFormData({
        heroTitle: savedData.heroTitle || "",
        heroSubtitle: savedData.heroSubtitle || "",
        heroImageUrl: savedData.heroImageUrl || "",
        logoUrl: savedData.logoUrl || "",
        faviconUrl: savedData.faviconUrl || "",
        seoTitle: savedData.seoTitle || "",
        seoDescription: savedData.seoDescription || "",
        seoKeywords: savedData.seoKeywords || "",
        googleSiteVerification: savedData.googleSiteVerification || "",
        googleAdsConversionId: savedData.googleAdsConversionId || "",
        googleAdsConversionLabel: savedData.googleAdsConversionLabel || "",
        socialFacebook: savedData.socialFacebook || "",
        socialInstagram: savedData.socialInstagram || "",
        socialPinterest: savedData.socialPinterest || "",
        socialTwitter: savedData.socialTwitter || "",
        socialYoutube: savedData.socialYoutube || "",
      })

      // Reset pending files
      setPendingFiles({ heroImage: null, logo: null, favicon: null })

      toast({
        title: "Settings Saved",
        description: "Your site configuration has been updated successfully.",
      })
    } catch (error: any) {
      console.error(error)
      toast({
        title: "Save Failed",
        description: error.message || "An error occurred while saving.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Settings</h1>
          <p className="mt-2 text-gray-600">Manage your homepage layout, branding, and SEO metadata.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px] bg-blue-600 hover:bg-blue-700">
          {isSaving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" /> Save Changes</>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b">
          <TabsList className="bg-transparent space-x-2">
            <TabsTrigger 
              value={Tab.HERO} 
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent"
            >
              Hero Layout
            </TabsTrigger>
            <TabsTrigger 
              value={Tab.BRANDING}
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent"
            >
              Branding
            </TabsTrigger>
            <TabsTrigger 
              value={Tab.SEO}
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 rounded-none bg-transparent"
            >
              SEO &amp; Metadata
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={Tab.HERO} className="pt-2">
          <HeroSettings 
            data={{ title: formData.heroTitle, subtitle: formData.heroSubtitle, imageUrl: formData.heroImageUrl }}
            pendingImage={pendingFiles.heroImage}
            onChange={handleChange}
            onFileChange={(f) => handleFileChange("heroImage", f)}
          />
        </TabsContent>

        <TabsContent value={Tab.BRANDING} className="pt-2">
          <BrandingSettings 
            data={{ 
              logoUrl: formData.logoUrl, 
              faviconUrl: formData.faviconUrl,
              socialFacebook: formData.socialFacebook,
              socialInstagram: formData.socialInstagram,
              socialPinterest: formData.socialPinterest,
              socialTwitter: formData.socialTwitter,
              socialYoutube: formData.socialYoutube
            }}
            pendingLogo={pendingFiles.logo}
            pendingFavicon={pendingFiles.favicon}
            onFileChange={handleFileChange}
            onChange={handleChange}
          />
        </TabsContent>

        <TabsContent value={Tab.SEO} className="pt-2">
          <SEOSettings
            data={{ seoTitle: formData.seoTitle, seoDescription: formData.seoDescription, seoKeywords: formData.seoKeywords, googleSiteVerification: formData.googleSiteVerification, googleAdsConversionId: formData.googleAdsConversionId, googleAdsConversionLabel: formData.googleAdsConversionLabel }}
            onChange={handleChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
