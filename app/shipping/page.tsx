
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  Package,
  Clock,
  MapPin,
  Shield,
  CheckCircle,
  AlertTriangle,
  Zap,
  Calendar,
  Info,
  Star,
  Globe,
  DollarSign,
  Timer,
  PackageCheck,
  Plane,
  Building,
  Phone,
  Mail,
} from "lucide-react"
import Link from "next/link"
import { Header } from "../components/header"
import { Footer } from "../components/footer"

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Shipping Policy
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Fast, secure, and reliable shipping for all your trading card game needs. We&apos;re committed to getting your
              cards to you quickly and safely.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Last updated: January 2024</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Secure & Insured Shipping</span>
              </div>
            </div>
          </div>

          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Free Shipping</h3>
                <p className="text-sm text-gray-600">On all orders over $75 with Standard shipping</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Same-Day Processing</h3>
                <p className="text-sm text-gray-600">Orders placed before 1 PM EST ship same day</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Secure Packaging</h3>
                <p className="text-sm text-gray-600">Professional packaging for card protection</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Shipping Options */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-blue-600" />
                  Shipping Options & Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-2 text-blue-900">Free Shipping Threshold</h4>
                      <p className="text-blue-800 mb-4">
                        Enjoy <strong>FREE Standard Shipping</strong> on all orders over $75! This applies to Standard
                        shipping only and is automatically applied at checkout.
                      </p>
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <h5 className="font-semibold mb-2">Free Shipping Benefits:</h5>
                        <ul className="text-sm space-y-1">
                          <li>• Automatic discount applied at checkout</li>
                          <li>• Same reliable 5-7 business day delivery</li>
                          <li>• Full tracking and insurance included</li>
                          <li>• No minimum item quantity required</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Standard Shipping */}
                  <div className="border-2 border-green-200 rounded-xl p-6 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl text-green-900">Standard Shipping</h4>
                          <p className="text-green-700">Most popular option</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">$9.99</div>
                        <div className="text-sm text-green-600 font-medium">FREE over $75</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold mb-2">Delivery Time</h5>
                        <p className="text-sm text-gray-700 mb-3">5-7 business days</p>
                        <h5 className="font-semibold mb-2">Features</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Full tracking included</li>
                          <li>• Insurance up to $100</li>
                          <li>• Signature confirmation available</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2">Best For</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Regular orders</li>
                          <li>• Budget-conscious customers</li>
                          <li>• Non-urgent purchases</li>
                          <li>• Orders over $75 (FREE!)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Express Shipping */}
                  <div className="border-2 border-orange-200 rounded-xl p-6 bg-gradient-to-r from-orange-50 to-yellow-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <Zap className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl text-orange-900">Express Shipping</h4>
                          <p className="text-orange-700">Faster delivery</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-600">$19.99</div>
                        <div className="text-sm text-orange-600">All orders</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold mb-2">Delivery Time</h5>
                        <p className="text-sm text-gray-700 mb-3">2-3 business days</p>
                        <h5 className="font-semibold mb-2">Features</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Priority handling</li>
                          <li>• Full tracking included</li>
                          <li>• Insurance up to $500</li>
                          <li>• Signature confirmation included</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2">Best For</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Tournament preparation</li>
                          <li>• Time-sensitive orders</li>
                          <li>• High-value purchases</li>
                          <li>• Gift orders</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Overnight Shipping */}
                  <div className="border-2 border-red-200 rounded-xl p-6 bg-gradient-to-r from-red-50 to-pink-50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <Plane className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xl text-red-900">Overnight Shipping</h4>
                          <p className="text-red-700">Next business day delivery</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">$39.99</div>
                        <div className="text-sm text-red-600">All orders</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-semibold mb-2">Delivery Time</h5>
                        <p className="text-sm text-gray-700 mb-3">1 business day</p>
                        <h5 className="font-semibold mb-2">Features</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Highest priority processing</li>
                          <li>• Real-time tracking</li>
                          <li>• Insurance up to $1,000</li>
                          <li>• Signature confirmation required</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold mb-2">Best For</h5>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>• Last-minute tournament needs</li>
                          <li>• Emergency replacements</li>
                          <li>• High-value collectibles</li>
                          <li>• Critical deadlines</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Processing Times */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-green-600" />
                  Order Processing & Handling Times
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="font-bold text-lg mb-4 text-green-900">Our Processing Commitment</h4>
                  <p className="text-green-800 mb-4">
                    We are committed to processing and shipping your orders within{" "}
                    <strong>one business day or less</strong>. Most orders placed before 1 PM EST are processed and
                    shipped the same day.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <Timer className="w-5 h-5 text-blue-600" />
                      Same-Day Processing
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-blue-900">Orders placed before 1 PM EST:</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Monday - Friday: Same-day processing</li>
                        <li>• Shipped within the same business day</li>
                        <li>• Tracking information sent immediately</li>
                        <li>• Priority handling for Express/Overnight</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      Next-Day Processing
                    </h4>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-orange-900">Orders placed after 1 PM EST:</h5>
                      <ul className="text-sm text-orange-800 space-y-1">
                        <li>• Monday - Thursday: Next business day</li>
                        <li>• Friday after 1 PM: Ships Monday</li>
                        <li>• Weekend orders: Ships Monday</li>
                        <li>• Holiday delays may apply</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Weekend & Holiday Processing</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                      <div>
                        <h5 className="font-semibold mb-2 text-yellow-900">Important Processing Notes</h5>
                        <ul className="text-sm text-yellow-800 space-y-2">
                          <li>
                            <strong>Weekend Orders:</strong> Orders placed on Saturday or Sunday will be processed the
                            following Monday
                          </li>
                          <li>
                            <strong>Holiday Schedule:</strong> Orders placed on federal holidays will be processed the
                            next business day
                          </li>
                          <li>
                            <strong>Large Orders:</strong> Orders with 50+ items may require additional processing time
                            (1-2 business days)
                          </li>
                          <li>
                            <strong>Custom Orders:</strong> Special requests or custom bundles may take 2-3 business
                            days
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <PackageCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h5 className="font-semibold mb-1">Standard Orders</h5>
                    <p className="text-sm text-gray-600">1-50 items: Same day processing</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <Building className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <h5 className="font-semibold mb-1">Large Orders</h5>
                    <p className="text-sm text-gray-600">50+ items: 1-2 business days</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <h5 className="font-semibold mb-1">Custom Orders</h5>
                    <p className="text-sm text-gray-600">Special requests: 2-3 business days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Carriers & Warehouse */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-purple-600" />
                  Warehouse Location & Shipping Carriers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Warehouse Location</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <Building className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                        <div>
                          <h5 className="font-semibold mb-2 text-purple-900">TCG Lore Distribution Center</h5>
                          <div className="space-y-1 text-sm text-purple-800">
                            <p>Flagler Beach, Florida</p>
                            <p>Central shipping location for optimal delivery times</p>
                            <p>Climate-controlled facility</p>
                            <p>24/7 security monitoring</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-blue-900">Shipping Coverage</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• All 50 US states</li>
                        <li>• Washington D.C.</li>
                        <li>• Puerto Rico & US territories</li>
                        <li>• APO/FPO military addresses</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Trusted Shipping Partners</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Truck className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">FedEx</h5>
                          <p className="text-sm text-gray-600">Express & Overnight shipping</p>
                        </div>
                        <Badge variant="outline">Primary</Badge>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">UPS</h5>
                          <p className="text-sm text-gray-600">Ground & Express services</p>
                        </div>
                        <Badge variant="outline">Secondary</Badge>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Globe className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold">USPS</h5>
                          <p className="text-sm text-gray-600">Standard & Priority Mail</p>
                        </div>
                        <Badge variant="outline">Standard</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h5 className="font-semibold mb-3">Carrier Selection Process</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium mb-2">Standard Shipping</h6>
                      <p className="text-gray-600">
                        USPS Priority Mail or UPS Ground based on destination and package size
                      </p>
                    </div>
                    <div>
                      <h6 className="font-medium mb-2">Express Shipping</h6>
                      <p className="text-gray-600">FedEx Express or UPS 2nd Day Air for optimal delivery times</p>
                    </div>
                    <div>
                      <h6 className="font-medium mb-2">Overnight Shipping</h6>
                      <p className="text-gray-600">FedEx Overnight or UPS Next Day Air with signature confirmation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transit Times & Disclaimers */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                  Transit Times & Important Disclaimers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-8 h-8 text-orange-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-lg mb-3 text-orange-900">Transit Time Disclaimer</h4>
                      <p className="text-orange-800 mb-4">
                        <strong>Important:</strong> All transit times listed are estimates provided by our shipping
                        carriers (USPS, UPS, and FedEx) and are not guaranteed. TCG Lore is not responsible for
                        shipping delays caused by carrier issues, weather conditions, or other circumstances beyond our
                        control.
                      </p>
                      <div className="bg-white rounded-lg p-4 border border-orange-200">
                        <h5 className="font-semibold mb-2">What We Guarantee:</h5>
                        <ul className="text-sm space-y-1">
                          <li>• Processing and shipping within 1 business day</li>
                          <li>• Proper packaging and handling of your items</li>
                          <li>• Accurate tracking information provided</li>
                          <li>• Insurance coverage as specified</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-red-600">Potential Delays</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <ul className="text-sm text-red-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Weather conditions:</strong> Severe weather may delay shipments
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Peak seasons:</strong> Holiday periods may extend transit times
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Carrier delays:</strong> Mechanical issues or high volume periods
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Address issues:</strong> Incorrect or incomplete addresses
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Customs delays:</strong> For APO/FPO and territory shipments
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-green-600">Our Commitment</h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <ul className="text-sm text-green-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Fast processing:</strong> Orders shipped within 1 business day
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Secure packaging:</strong> Professional protection for all items
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Full tracking:</strong> Real-time updates on your shipment
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Insurance coverage:</strong> Protection against loss or damage
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Customer support:</strong> Help with any shipping issues
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h5 className="font-semibold mb-3 text-blue-900">Delivery Estimates by Region</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium mb-2">Southeast (FL, GA, AL, SC, NC)</h6>
                      <ul className="text-blue-800 space-y-1">
                        <li>• Standard: 2-4 business days</li>
                        <li>• Express: 1-2 business days</li>
                        <li>• Overnight: Next business day</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium mb-2">East Coast & Central US</h6>
                      <ul className="text-blue-800 space-y-1">
                        <li>• Standard: 3-5 business days</li>
                        <li>• Express: 2-3 business days</li>
                        <li>• Overnight: Next business day</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium mb-2">West Coast & Remote Areas</h6>
                      <ul className="text-blue-800 space-y-1">
                        <li>• Standard: 5-7 business days</li>
                        <li>• Express: 2-3 business days</li>
                        <li>• Overnight: Next business day</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pre-Orders & Special Handling */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  Pre-Orders & Special Handling
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h4 className="font-bold text-lg mb-4 text-purple-900">Pre-Order Shipping Policy</h4>
                  <p className="text-purple-800 mb-4">
                    Orders containing pre-order items will ship when{" "}
                    <strong>all items in the order are available</strong>. This ensures you receive your complete order
                    in one shipment, reducing shipping costs and potential damage from multiple packages.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Standard Pre-Order Process</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">1</span>
                        </div>
                        <div className="text-sm">
                          <strong>Order Placed:</strong> Your pre-order is confirmed and payment is processed
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">2</span>
                        </div>
                        <div className="text-sm">
                          <strong>Release Date:</strong> Items become available on the official release date
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-blue-600">3</span>
                        </div>
                        <div className="text-sm">
                          <strong>Shipment:</strong> Complete order ships within 1 business day of release
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Partial Shipment Option</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 mb-3">
                        <strong>At our discretion</strong>, we may send partial shipments in the following cases:
                      </p>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Significant delays in pre-order items (30+ days)</li>
                        <li>• Customer request for available items</li>
                        <li>• High-value orders to reduce risk</li>
                        <li>• Perishable or time-sensitive items</li>
                      </ul>
                      <p className="text-xs text-yellow-700 mt-3">
                        Additional shipping charges may apply for partial shipments
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Mixed Order Examples</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-blue-900">Scenario 1: In-Stock + Pre-Order</h5>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>
                          <strong>Order:</strong> 5 booster packs (in stock) + 1 pre-order box
                        </p>
                        <p>
                          <strong>Shipping:</strong> Complete order ships when pre-order box is available
                        </p>
                        <p>
                          <strong>Timeline:</strong> Ships on pre-order release date
                        </p>
                      </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2 text-green-900">Scenario 2: Multiple Pre-Orders</h5>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>
                          <strong>Order:</strong> 2 different pre-order sets with different release dates
                        </p>
                        <p>
                          <strong>Shipping:</strong> Ships when the last item becomes available
                        </p>
                        <p>
                          <strong>Timeline:</strong> Ships on the latest release date
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h5 className="font-semibold mb-3">Pre-Order Communication</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h6 className="font-medium mb-1">Order Confirmation</h6>
                      <p className="text-gray-600">Immediate email with expected ship date</p>
                    </div>
                    <div className="text-center">
                      <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h6 className="font-medium mb-1">Release Updates</h6>
                      <p className="text-gray-600">Notifications of any date changes</p>
                    </div>
                    <div className="text-center">
                      <Truck className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h6 className="font-medium mb-1">Shipping Notice</h6>
                      <p className="text-gray-600">Tracking info when order ships</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Packaging & Protection */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-green-600" />
                  Professional Packaging & Card Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h4 className="font-bold text-lg mb-4 text-green-900">Our Packaging Promise</h4>
                  <p className="text-green-800 mb-4">
                    Every order is professionally packaged using industry-standard materials to ensure your trading
                    cards arrive in perfect condition. We understand the value and fragility of collectible cards.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Individual Cards</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Penny Sleeves:</strong> Each card placed in a protective penny sleeve
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Toploaders:</strong> High-value cards ($25+) get rigid toploader protection
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Team Bags:</strong> Multiple cards grouped in team bags for organization
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Sealed Products</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Bubble Wrap:</strong> All boxes and packs wrapped in protective bubble wrap
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Box Padding:</strong> Void fill material prevents movement during transit
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <Package className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <strong>Fragile Handling:</strong> Clear fragile stickers on all packages
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-bold text-lg">Package Types by Order Value</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2">Orders Under $50</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Padded envelope or small box</li>
                        <li>• Bubble wrap protection</li>
                        <li>• Standard tracking included</li>
                        <li>• Insurance up to $50</li>
                      </ul>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2">Orders $50-$200</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Sturdy cardboard box</li>
                        <li>• Multiple layers of protection</li>
                        <li>• Signature confirmation available</li>
                        <li>• Insurance up to $200</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h5 className="font-semibold mb-2">Orders Over $200</h5>
                      <ul className="text-sm text-purple-700 space-y-1">
                        <li>• Double-wall corrugated box</li>
                        <li>• Premium packaging materials</li>
                        <li>• Signature confirmation required</li>
                        <li>• Full insurance coverage</li>
                      </ul>
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
                  Shipping Support & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Need Help With Shipping?</h4>
                    <p className="text-sm text-gray-600">
                      Our shipping team is here to help with tracking, delivery issues, or special shipping requests.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-semibold">+1 (303) 668-3245</div>
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
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold text-lg">Common Shipping Questions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Order tracking and status updates</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Address changes before shipment</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Special delivery instructions</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>International shipping inquiries</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Damaged package claims</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link href="mailto:cs@tcglore.com" className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Shipping Team
                    </Button>
                  </Link>
                  <Link href="tel:+13036683245" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      <Phone className="w-4 h-4 mr-2" />
                      Call +1 (303) 668-3245
                    </Button>
                  </Link>
                </div>
                <div className="pt-6 text-center text-sm text-gray-500 font-medium">
                  TCG Lore is an online trading card store operated by A Toy Haulerz LLC.
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link href="/account" className="flex-1">
                <Button variant="outline" className="w-full h-12 bg-transparent">
                  <Package className="w-5 h-5 mr-2" />
                  Track My Orders
                </Button>
              </Link>
              <Link href="/products" className="flex-1">
                <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Truck className="w-5 h-5 mr-2" />
                  Start Shopping
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

