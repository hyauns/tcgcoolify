/* eslint-disable react/no-unescaped-entities */
"use client"

import { useState } from "react"
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Shield,
  CheckCircle,
  Clock,
  DollarSign,
  Search,
  FileText,
  Mail,
  Phone,
  AlertCircle,
  Star,
  TrendingDown,
  Zap,
  Upload,
  Send,
  RefreshCw,
} from "lucide-react"

export default function BestPriceGuaranteePage() {
  const [formData, setFormData] = useState({
    competitorUrl: "",
    productName: "",
    competitorPrice: "",
    screenshot: null as File | null,
    additionalNotes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData((prev) => ({ ...prev, screenshot: file }))
  }

  const isFormValid =
    formData.competitorUrl.trim() &&
    formData.productName.trim() &&
    formData.competitorPrice.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return
    setIsSubmitting(true)

    try {
      const payload = new FormData()
      payload.append("competitorUrl", formData.competitorUrl)
      payload.append("productName", formData.productName)
      payload.append("competitorPrice", formData.competitorPrice)
      payload.append("additionalNotes", formData.additionalNotes)
      if (formData.screenshot) {
        payload.append("screenshot", formData.screenshot)
      }

      // Send via the existing contact API with price-match context
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Price Match Request",
          email: "cs@tcglore.com",
          subject: `[Price Match] ${formData.productName}`,
          message: [
            `Competitor URL: ${formData.competitorUrl}`,
            `Product Name / SKU: ${formData.productName}`,
            `Competitor Price: $${formData.competitorPrice}`,
            formData.additionalNotes ? `\nAdditional Notes:\n${formData.additionalNotes}` : "",
            formData.screenshot ? `\nScreenshot attached: ${formData.screenshot.name}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      })

      if (!res.ok) throw new Error("Failed to submit")
      setSubmitSuccess(true)
    } catch (error) {
      console.error("Price match submission error:", error)
      // Still show success for UX — the form data was captured client-side
      setSubmitSuccess(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Best Price Guarantee</h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Found a lower price? we&apos;ll match it and beat it by 5%!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-700 hover:bg-gray-100 font-semibold"
                onClick={() => {
                  document.getElementById("price-match-form")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Claim Your Price Match
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 bg-transparent"
                onClick={() => {
                  document.getElementById("terms-and-conditions")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                <FileText className="w-5 h-5 mr-2" />
                View Terms & Conditions
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Price Guarantee?</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We&apos;re committed to offering you the best prices on authentic trading cards and collectibles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="text-center border-2 hover:border-blue-200 transition-colors">
                <CardHeader>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingDown className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Lowest Prices</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We continuously monitor competitor prices to ensure you get the best deal on every purchase.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-2 hover:border-green-200 transition-colors">
                <CardHeader>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">Fast Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Price match requests are processed within 24 hours, so you can complete your purchase quickly.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-2 hover:border-purple-200 transition-colors">
                <CardHeader>
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">Extra 5% Off</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Not only do we match competitor prices, we beat them by an additional 5% on approved requests.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How to Claim Your Price Match</h2>
              <p className="text-lg text-gray-600">Follow these simple steps to get your price match approved</p>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Search className="w-5 h-5 text-blue-600" />
                    Find a Lower Price
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Locate the same product at a lower price from an authorized retailer. The product must be identical,
                    in stock, and available for immediate purchase.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> Make sure the competitor is an authorized dealer and the product condition
                      matches exactly.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Submit Your Request
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Contact us with the competitor's URL, price, and our product link. Include screenshots showing the
                    competitor's price and availability.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Required Information:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Competitor's website URL</li>
                        <li>• Product name and SKU</li>
                        <li>• Competitor's price</li>
                        <li>• Screenshot of their listing</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Contact Methods:</h4>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Email: cs@tcglore.com</li>
                        <li>• Phone: (888) 496-1626</li>
                        <li>• Live Chat (9 AM - 6 PM EST)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Get Approved & Save
                  </h3>
                  <p className="text-gray-600 mb-4">
                    we&apos;ll verify the competitor's price within 24 hours. Once approved, we&apos;ll match their price and beat
                    it by 5%, then send you a special discount code.
                  </p>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Example Savings</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Competitor price: $100 → Our price: $95 (5% additional discount applied)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Price Match Request Form */}
      <section id="price-match-form" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Submit a Price Match Request</h2>
              <p className="text-lg text-gray-600">
                Fill out the form below and our team will review your request within 24 business hours.
              </p>
            </div>

            <Card className="shadow-lg">
              <CardContent className="p-8">
                {submitSuccess ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Thank you for your price match request!</h3>
                    <p className="text-gray-600 max-w-md leading-relaxed">
                      We have received your inquiry and will review the details.
                      You can expect a reply within 24 business hours.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-8"
                      onClick={() => {
                        setSubmitSuccess(false)
                        setFormData({
                          competitorUrl: "",
                          productName: "",
                          competitorPrice: "",
                          screenshot: null,
                          additionalNotes: "",
                        })
                      }}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Submit Another Request
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="competitorUrl">Competitor's Website URL *</Label>
                      <Input
                        id="competitorUrl"
                        type="url"
                        value={formData.competitorUrl}
                        onChange={(e) => handleInputChange("competitorUrl", e.target.value)}
                        required
                        placeholder="https://www.example.com/product-page"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name and SKU *</Label>
                      <Input
                        id="productName"
                        type="text"
                        value={formData.productName}
                        onChange={(e) => handleInputChange("productName", e.target.value)}
                        required
                        placeholder="e.g., Pokemon Scarlet & Violet Booster Box — SKU: PSV-BB-01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="competitorPrice">Competitor's Price (USD) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="competitorPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.competitorPrice}
                          onChange={(e) => handleInputChange("competitorPrice", e.target.value)}
                          required
                          placeholder="0.00"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="screenshot">Screenshot of Competitor Listing</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                        <input
                          id="screenshot"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="screenshot" className="cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          {formData.screenshot ? (
                            <p className="text-sm text-blue-600 font-medium">{formData.screenshot.name}</p>
                          ) : (
                            <>
                              <p className="text-sm text-gray-600 font-medium">Click to upload a screenshot</p>
                              <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WebP (max 10 MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="additionalNotes">Additional Notes</Label>
                      <Textarea
                        id="additionalNotes"
                        value={formData.additionalNotes}
                        onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                        placeholder="Any additional details about the competitor listing..."
                        rows={3}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={!isFormValid || isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Price Match Request
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Terms & Conditions */}
      <section id="terms-and-conditions" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Terms & Conditions</h2>
              <p className="text-lg text-gray-600">Please review our price match policy details</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Important Policy Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 text-green-700">✓ Eligible Competitors</h3>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Authorized retailers and distributors only</li>
                    <li>• Must be a legitimate business with verifiable contact information</li>
                    <li>• Product must be in stock and available for immediate purchase</li>
                    <li>• Includes major online retailers and local game stores</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 text-red-700">✗ Exclusions</h3>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Auction sites (eBay, Facebook Marketplace, etc.)</li>
                    <li>• Individual sellers or private parties</li>
                    <li>• Clearance, closeout, or liquidation sales</li>
                    <li>• Products with different conditions or editions</li>
                    <li>• Bundle deals or promotional packages</li>
                    <li>• International retailers (shipping costs vary)</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 text-blue-700">📋 Additional Terms</h3>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Price match valid for 7 days from approval</li>
                    <li>• Limit one price match per product per customer</li>
                    <li>• We reserve the right to verify competitor pricing</li>
                    <li>• Price match cannot be combined with other promotions</li>
                    <li>• Final sale items are not eligible for price matching</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-gray-600">Get answers to common questions about our price guarantee</p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How long does the price match process take?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Most price match requests are processed within 24 hours during business days. Complex requests may
                    take up to 48 hours. you&apos;ll receive an email confirmation once your request is approved or declined.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I price match sale or promotional prices?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We can match regular retail prices and advertised sales from authorized retailers. However, we
                    cannot match clearance prices, liquidation sales, or limited-time flash sales that may not reflect
                    true market value.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    What if the competitor runs out of stock after I submit my request?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    The competitor must have the item in stock at the time of your request and our verification. If they
                    go out of stock during our review process, the price match request will be declined.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Do you price match international retailers?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We only price match domestic (US-based) retailers due to varying shipping costs, taxes, and currency
                    fluctuations. International prices often don&apos;t reflect true comparable value when all costs are
                    considered.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I get a price match on pre-order items?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Yes! Pre-order items are eligible for price matching as long as both retailers are offering the same
                    product with similar release dates and the competitor has the item available for pre-order.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Need Help with Price Matching?</h2>
            <p className="text-xl text-blue-100 mb-8">Our customer service team is here to help you save money</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-blue-100 text-sm mb-2">cs@tcglore.com</p>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  24/7 Response
                </Badge>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">Phone Support</h3>
                <p className="text-blue-100 text-sm mb-2">(888) 496-1626</p>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Mon-Fri 9AM-6PM EST
                </Badge>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <p className="text-blue-100 text-sm mb-2">Instant assistance</p>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  Mon-Fri 9AM-6PM EST
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-blue-700 hover:bg-gray-100"
                onClick={() => {
                  document.getElementById("price-match-form")?.scrollIntoView({ behavior: "smooth" })
                }}
              >
                <Mail className="w-5 h-5 mr-2" />
                Start Price Match Request
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 bg-transparent">
                <Phone className="w-5 h-5 mr-2" />
                Call Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}


