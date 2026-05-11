/* eslint-disable react/no-unescaped-entities */
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, Users, Shield, Zap, Mail, MapPin, Clock, Award } from "lucide-react"
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About TCG Lore - Premium Trading Card Games Store | Our Story & Mission",
  description:
    "Learn about TCG Lore's mission to provide authentic Magic: The Gathering, Pokemon, Yu-Gi-Oh! cards. Founded in Miami 2019, serving 50,000+ satisfied TCG customers worldwide.",
  keywords:
    "TCG Lore history, trading card store Miami, authentic TCG products, Magic Pokemon Yu-Gi-Oh store, collectible card games company",
  openGraph: {
    title: "About TCG Lore - Premium Trading Card Games Store",
    description: "Learn about our mission to provide authentic trading cards and serve the TCG community since 2019.",
    url: "https://tcglore.com/about",
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <div className="bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white py-20">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-blue-600 hover:bg-blue-700">Est. 2019</Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                About TCG Lore.
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                Where passion meets play, and every trading card tells a story of authentic TCG experiences
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span>Flagler Beach, Florida TCG Lore.</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Users className="w-4 h-4" />
                  <span>50,000+ Happy TCG Customers</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Award className="w-4 h-4" />
                  <span>5+ Years Trading Card Excellence</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Trading Card Mission</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-6"></div>
              </div>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardContent className="p-8 md:p-12">
                  <div className="text-center">
                    <Heart className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-8">
                      At TCG Lore, We&apos;re more than just a trading card store – We&apos;re a community of passionate
                      Magic: The Gathering, Pokemon, and Yu-Gi-Oh! collectors, competitive players, and gaming
                      enthusiasts. Our mission is to fuel your passion for collectible card games by providing
                      authentic, high-quality TCG products and fostering connections within the global trading card
                      community.
                    </p>
                    <blockquote className="text-2xl font-semibold text-blue-900 italic">
                      "Every trading card has a story, every game creates memories, and every collector deserves
                      authentic TCG products."
                    </blockquote>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-16 bg-white/50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Trading Card Store Story</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-6"></div>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">The Beginning (2019)</h3>
                      <p className="text-gray-600">
                        Founded in the heart of Miami by lifelong TCG enthusiasts Marcus Chen and Sarah Rodriguez, TCG Lore started as a small local trading card store with a big dream: to create the ultimate
                        destination for Magic: The Gathering, Pokemon, and Yu-Gi-Oh! collectors.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Going Digital (2021)</h3>
                      <p className="text-gray-600">
                        Recognizing the need to serve trading card collectors worldwide, we expanded online, bringing
                        our carefully curated selection of authentic TCG products and personal touch to customers across
                        the globe. Our authentication process and customer service set new industry standards for online
                        trading card stores.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">TCG Community First (Today)</h3>
                      <p className="text-gray-600">
                        Today, We&apos;re proud to serve over 50,000 trading card collectors worldwide, hosting tournaments,
                        supporting local game stores, and maintaining our commitment to authenticity and exceptional
                        customer service for all TCG products.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                    <h3 className="text-2xl font-bold mb-4">What Makes Our TCG Store Different</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-blue-200" />
                        <span>100% Authentic Trading Cards Guarantee</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-red-300" />
                        <span>Passionate TCG Expert Team</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-yellow-300" />
                        <span>Lightning-Fast Shipping</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-green-300" />
                        <span>Active Trading Card Community Support</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Trading Card Store Values</h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto mb-6"></div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow border-0">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Authenticity</h3>
                    <p className="text-gray-600">
                      Every trading card product is verified by our expert team. We guarantee the authenticity of every
                      Magic: The Gathering, Pokemon, and Yu-Gi-Oh! card, pack, and collectible we sell.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow border-0">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Community</h3>
                    <p className="text-gray-600">
                      We believe in building lasting relationships with our trading card customers and supporting the
                      global TCG community through events and partnerships.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow border-0">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Passion</h3>
                    <p className="text-gray-600">
                      Our team consists of dedicated Magic: The Gathering, Pokemon, and Yu-Gi-Oh! players and collectors
                      who understand the excitement and value of every card in your collection.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-gradient-to-r from-blue-900 to-purple-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Get in Touch with Our TCG Store</h2>
              <p className="text-xl text-blue-100 mb-12">
                Have questions about trading cards? Want to share your latest pull? We'd love to hear from you!
              </p>

              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6 text-center">
                    <Mail className="w-8 h-8 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">Email Us</h3>
                    <Link
                      href="mailto:cs@tcglore.com"
                      className="text-blue-300 hover:text-white transition-colors block"
                    >
                      cs@tcglore.com
                    </Link>
                    <a href="tel:+13036683245" className="text-blue-300 hover:text-white transition-colors block mt-2">
                      +1 (303) 668-3245
                    </a>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-8 h-8 text-green-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">Business Operator</h3>
                    <p className="text-green-200">
                      A Toy Haulerz LLC
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6 text-center">
                    <MapPin className="w-8 h-8 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-white">Office Address</h3>
                    <p className="text-purple-200">
                      1757 NORTH CENTRAL AVENUE
                      <br />
                      FLAGLER BEACH, FL 32136
                      <br />
                      United States
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-12">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-white text-blue-900 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Contact Our TCG Store Today
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}


