
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Shield,
  Clock,
  Phone,
  MapPin,
  Mail,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Truck,
  FileText,
  Camera,
  Star,
  Info,
  Calendar,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import { Header } from "../components/header"
import { Footer } from "../components/footer"

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Return & Refund Policy
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We want you to be completely satisfied with your TCG purchases. Our comprehensive return policy ensures a
              hassle-free experience for all trading card game enthusiasts.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Last updated: January 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Google Merchant Center Compliant</span>
              </div>
            </div>
          </div>

          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">30-Day Window</h3>
                <p className="text-sm text-gray-600">Full refund or exchange within 30 days of purchase date</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Condition Protected</h3>
                <p className="text-sm text-gray-600">Cards must be in original condition with protective sleeves</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Original Payment</h3>
                <p className="text-sm text-gray-600">Refunds processed to your original payment method</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Return Window */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Return Window & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-2 text-blue-900">30-Day Return Policy</h4>
                      <p className="text-blue-800 mb-4">
                        You have <strong>30 calendar days</strong> from the date of purchase to return items for a full
                        refund or exchange. The return window begins on the date your order was delivered, as confirmed
                        by tracking information.
                      </p>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h5 className="font-semibold mb-2">Important Dates:</h5>
                        <ul className="text-sm space-y-1">
                          <li>• Purchase date = Order delivery date (not order placement date)</li>
                          <li>• Return must be initiated within 30 days</li>
                          <li>• Items must be received by us within 45 days of purchase</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Eligible for Return
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Sealed booster packs, boxes, and cases</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Individual cards in original protective sleeves</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Deck boxes, sleeves, and accessories</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Playmats and gaming supplies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Items with manufacturing defects</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Not Eligible for Return
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Opened booster packs or boxes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Cards removed from protective sleeves</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Damaged cards due to customer handling</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Custom or personalized items</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>Digital products or codes (once redeemed)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Condition Requirements */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Star className="w-6 h-6 text-yellow-600" />
                  Card Condition Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h4 className="font-bold text-lg mb-4 text-yellow-900">Special Requirements for Trading Cards</h4>
                  <p className="text-yellow-800 mb-4">
                    Due to the collectible nature of trading cards, we have specific condition requirements to ensure
                    fair returns for all customers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Individual Cards</h4>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <strong>Must remain in protective sleeves:</strong> Cards should stay in the penny sleeves or
                          toploaders we provided
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <strong>No visible damage:</strong> Cards must be free from bends, creases, scratches, or
                          water damage
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <strong>Original condition:</strong> Cards must be in the same condition as when shipped
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Sealed Products</h4>
                    <ul className="space-y-3 text-sm">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <strong>Factory sealed:</strong> Booster packs and boxes must remain unopened with original
                          shrink wrap
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <strong>No tampering:</strong> Seals must be intact with no signs of opening or resealing
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <strong>Original packaging:</strong> Items must include all original packaging materials
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How to Initiate a Return */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-green-600" />
                  How to Initiate a Return
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-blue-600">1</span>
                    </div>
                    <h4 className="font-bold mb-2">Contact Us</h4>
                    <p className="text-sm text-gray-600">
                      Email us or call to start your return within 30 days of purchase
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-green-600">2</span>
                    </div>
                    <h4 className="font-bold mb-2">Get RMA Number</h4>
                    <p className="text-sm text-gray-600">
                      we&apos;ll provide a Return Merchandise Authorization number and instructions
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-purple-600">3</span>
                    </div>
                    <h4 className="font-bold mb-2">Ship Items</h4>
                    <p className="text-sm text-gray-600">Package securely and ship to our returns address</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  <h4 className="font-bold text-lg">Step-by-Step Return Process</h4>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold mb-2">1. Contact Customer Service</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          Reach out to us within 30 days of your purchase date. Provide your order number and reason for
                          return.
                        </p>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-blue-600" />
                            <span>cs@tcglore.com</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-blue-600" />
                            <span>(888) 496-1626</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold mb-2">2. Receive RMA Number</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          we&apos;ll email you a Return Merchandise Authorization (RMA) number within 24 hours, along with
                          detailed return instructions and a prepaid shipping label if applicable.
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Keep this RMA number for tracking
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold mb-2">3. Document Items (Recommended)</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          Take photos of items before packaging to document their condition. This helps resolve any
                          disputes quickly.
                        </p>
                        <ul className="text-xs text-gray-500 space-y-1">
                          <li>• Photo of overall item condition</li>
                          <li>• Close-up of any existing damage</li>
                          <li>• Photo of protective sleeves/packaging</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Packaging and Shipping */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-orange-600" />
                  Packaging & Shipping Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h4 className="font-bold text-lg mb-4 text-orange-900">Critical Packaging Requirements</h4>
                  <p className="text-orange-800 mb-4">
                    Proper packaging is essential to protect valuable trading cards during return shipping. Improperly
                    packaged items may be damaged in transit and could affect your refund eligibility.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">For Individual Cards</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">1</span>
                        </div>
                        <div className="text-sm">
                          <strong>Keep in protective sleeves:</strong> Do not remove cards from penny sleeves or
                          toploaders
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">2</span>
                        </div>
                        <div className="text-sm">
                          <strong>Use team bags:</strong> Place sleeved cards in team bags or card savers for extra
                          protection
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">3</span>
                        </div>
                        <div className="text-sm">
                          <strong>Bubble wrap:</strong> Wrap the protected cards in bubble wrap to prevent movement
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">4</span>
                        </div>
                        <div className="text-sm">
                          <strong>Sturdy box:</strong> Use a rigid box with padding to prevent bending
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">For Sealed Products</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-600">1</span>
                        </div>
                        <div className="text-sm">
                          <strong>Original packaging:</strong> Include all original packaging materials and inserts
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-600">2</span>
                        </div>
                        <div className="text-sm">
                          <strong>Protective wrapping:</strong> Wrap boxes in bubble wrap or packing paper
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-600">3</span>
                        </div>
                        <div className="text-sm">
                          <strong>Fill empty space:</strong> Use packing material to prevent items from shifting
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-600">4</span>
                        </div>
                        <div className="text-sm">
                          <strong>Seal securely:</strong> Use quality packing tape to seal all box seams
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Return Shipping Address</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-semibold mb-2">TCG Lore Returns Department</h5>
                        <div className="space-y-1 text-sm">
                          <p>1757 NORTH CENTRAL AVENUE</p>
                          <p>FLAGLER BEACH, FL 32136</p>
                          <p>United States</p>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-yellow-800">
                            <strong>Important:</strong> Include your RMA number on the package label and inside the box
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-blue-900">Shipping Recommendations</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Use trackable shipping method</li>
                        <li>• Consider insurance for high-value items</li>
                        <li>• Keep tracking number until refund is processed</li>
                        <li>• Allow 7-10 business days for delivery</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-green-900">Free Return Shipping</h5>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Orders over $100: Free return label provided</li>
                        <li>• Defective items: Always free return shipping</li>
                        <li>• Our error: Free return shipping included</li>
                        <li>• Standard returns under $100: Customer pays</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Refund Process */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  Refund Process & Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Truck className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-bold mb-2">Items Received</h4>
                    <p className="text-sm text-gray-600">We inspect returned items within 2-3 business days</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h4 className="font-bold mb-2">Inspection Complete</h4>
                    <p className="text-sm text-gray-600">Refund approved and processed within 1-2 business days</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="font-bold mb-2">Refund Issued</h4>
                    <p className="text-sm text-gray-600">Funds appear in your account within 3-5 business days</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-6">
                  <h4 className="font-bold text-lg">Refund Methods & Timeline</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="font-semibold">Original Payment Method</h5>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Credit/Debit Cards</div>
                            <div className="text-xs text-gray-600">3-5 business days</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <div className="flex-1">
                            
                            <div className="text-xs text-gray-600">1-2 business days</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-purple-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Other Methods</div>
                            <div className="text-xs text-gray-600">Varies by payment type</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="font-semibold">Alternative Options</h5>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <Star className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Store Credit</div>
                            <div className="text-xs text-blue-600">Instant</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Package className="w-5 h-5 text-green-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Exchange</div>
                            <div className="text-xs text-green-600">Same-day processing</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                          <strong>Note:</strong> Store credit never expires
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h5 className="font-semibold mb-3">Refund Amount Calculation</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Item cost:</span>
                      <span>Full refund</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Original shipping:</span>
                      <span>Refunded if order over $75</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Return shipping:</span>
                      <span>Customer pays (unless our error)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxes:</span>
                      <span>Full refund</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total refund:</span>
                      <span>Item cost + applicable shipping + taxes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special Situations */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  Special Situations & Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-red-600">Damaged During Shipping</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800 mb-3">
                        If items are damaged during return shipping due to inadequate packaging:
                      </p>
                      <ul className="text-sm text-red-800 space-y-1">
                        <li>• Partial refund may apply based on damage extent</li>
                        <li>• Photos will be taken and shared with customer</li>
                        <li>• Insurance claims will be filed when applicable</li>
                        <li>• Customer may be responsible for shipping costs</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-blue-600">Lost in Transit</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 mb-3">If return package is lost during shipping:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Tracking information will be reviewed</li>
                        <li>• Insurance claims filed when available</li>
                        <li>• Full refund issued once loss is confirmed</li>
                        <li>• Process may take 10-15 business days</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-green-600">Manufacturing Defects</h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800 mb-3">Items with manufacturing defects receive priority:</p>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Free return shipping provided</li>
                        <li>• Eligible for full refund or replacement</li>
                        <li>• Extended 60-day return window</li>
                        <li>• Expedited processing within 24 hours</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-purple-600">Our Shipping Error</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-purple-800 mb-3">When we ship the wrong item or quantity:</p>
                      <ul className="text-sm text-purple-800 space-y-1">
                        <li>• Free return shipping both ways</li>
                        <li>• Priority replacement shipping</li>
                        <li>• Discount on next order at our discretion</li>
                        <li>• Same-day processing when possible</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Dispute Resolution</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-700 mb-4">
                      If you disagree with our return decision, we offer a fair dispute resolution process:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Phone className="w-6 h-6 text-blue-600" />
                        </div>
                        <h5 className="font-semibold text-sm mb-1">Contact Manager</h5>
                        <p className="text-xs text-gray-600">Speak with a senior team member</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <FileText className="w-6 h-6 text-green-600" />
                        </div>
                        <h5 className="font-semibold text-sm mb-1">Provide Evidence</h5>
                        <p className="text-xs text-gray-600">Submit photos and documentation</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                        <h5 className="font-semibold text-sm mb-1">Final Review</h5>
                        <p className="text-xs text-gray-600">Decision within 48 hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Phone className="w-6 h-6 text-blue-600" />
                  Contact Our Returns Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Get Help With Your Return</h4>
                    <p className="text-sm text-gray-600">
                      Our dedicated returns team is here to help make your return process as smooth as possible.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold">(888) 496-1626</div>
                          <div className="text-sm text-gray-600">Mon-Fri 9AM-6PM EST</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold">cs@tcglore.com</div>
                          <div className="text-sm text-gray-600">Response within 24 hours</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <div className="font-semibold">Returns Address</div>
                          <div className="text-sm text-gray-600">
                            1757 NORTH CENTRAL AVENUE
                            <br />
                            FLAGLER BEACH, FL 32136
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Before You Contact Us</h4>
                    <p className="text-sm text-gray-600 mb-4">Have this information ready to speed up the process:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Order number</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Email address used for purchase</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Reason for return</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Photos of items (if damaged)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Preferred refund method</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="mailto:cs@tcglore.com" className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Returns Team
                    </Button>
                  </Link>
                  <Link href="tel:+18884961626" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Phone className="w-4 h-4 mr-2" />
                      Call (888) 496-1626
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Google Merchant Center Compliance */}
            <Card className="shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-green-600" />
                  Policy Compliance & Legal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold mb-3">Google Merchant Center Compliance</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Clear 30-day return window displayed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Physical return address provided</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Customer service contact information listed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Refund method and timeline specified</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Return process clearly outlined</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-3">Consumer Rights</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Right to return within stated timeframe</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Right to full refund for defective items</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Right to dispute resolution process</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Protection under state consumer laws</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Right to clear policy communication</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    This return policy is effective as of January 2024 and complies with Google Merchant Center
                    requirements and applicable consumer protection laws. For questions about your rights as a consumer,
                    please contact our customer service team.
                  </p>
                  <p className="text-sm text-gray-500 font-medium">
                    TCG Lore is an online trading card store operated by A Toy Haulerz LLC.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link href="/account" className="flex-1">
                <Button variant="outline" className="w-full h-12 bg-transparent">
                  <FileText className="w-5 h-5 mr-2" />
                  View My Orders
                </Button>
              </Link>
              <Link href="/contact" className="flex-1">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Start a Return
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

