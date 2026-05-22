import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck, PackageSearch, Boxes, Truck, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import { siteUrl } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Authenticity & Trust | TCG Lore",
  description:
    "How TCG Lore, operated by A Toy Haulerz LLC, sources, inspects, and ships trading card products. Our authenticity, sourcing, and quality-check process.",
  alternates: {
    canonical: `${siteUrl}/authenticity`,
  },
}

export default function AuthenticityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header />

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Authenticity &amp; Trust
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              How TCG Lore, operated by A Toy Haulerz LLC, sources, inspects, and ships the trading card products in our catalog.
            </p>
          </div>

          {/* Sourcing */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Boxes className="w-6 h-6 text-blue-600" />
                Where Our Products Come From
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We source trading card products through U.S. supplier and distributor networks. Our buying focuses on sealed
                products and singles that are commonly traded through the established U.S. hobby market.
              </p>
              <p>
                TCG Lore is an independent online store. We are not an &quot;official partner,&quot; licensee, or affiliated reseller
                of any game publisher. Brand and publisher names are used solely to identify compatible products.
              </p>
            </CardContent>
          </Card>

          {/* Inspection */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <PackageSearch className="w-6 h-6 text-blue-600" />
                Inspection Before Listing &amp; Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Every order is reviewed and packed by our team before it ships. As part of that process we check:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Product identity:</strong> the title, SKU, set, and listing image match the item being shipped.</li>
                <li><strong>Condition:</strong> the visible condition matches what the listing advertises.</li>
                <li><strong>Packaging:</strong> sealed items remain sealed; seals, shrink wrap, UPC labels, and outer packaging are checked for tampering or damage where applicable.</li>
                <li><strong>Shipping protection:</strong> items are packed to reduce the risk of damage in transit. See our <Link href="/shipping" className="text-blue-600 underline">Shipping Policy</Link> for details on how orders are packed and shipped.</li>
              </ul>
              <p>
                For graded cards (PSA, BGS, CGC, etc.), when applicable, we list the grading company and certification number as
                shown on the slab so buyers can verify the grade directly with the grading service.
              </p>
            </CardContent>
          </Card>

          {/* What we do not claim */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                What We Do Not Claim
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                To stay transparent with shoppers, here is what we explicitly do <strong>not</strong> claim:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>We do not claim to perform forensic authentication on every individual raw (ungraded) card.</li>
                <li>We do not claim to be an official partner, licensee, or affiliated reseller of any game publisher.</li>
                <li>We do not claim a sealed product is genuine beyond our inspection process described above.</li>
              </ul>
              <p>
                If you receive an item that does not match the listing — wrong product, undisclosed damage, tampered seal, or
                wrong grade on the slab — please contact us within the return window described in our{" "}
                <Link href="/returns" className="text-blue-600 underline">Return Policy</Link>.
              </p>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Are the products on TCG Lore authentic?</h3>
                <p>
                  We source from U.S. distributor and supplier networks commonly used by the hobby industry, and every order is
                  inspected against the listing before it ships. We do not guarantee third-party forensic authentication on raw
                  cards; the inspection process described above is our quality-control standard.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How does TCG Lore source products?</h3>
                <p>
                  Through U.S. supplier and distributor networks. We focus on sealed product and commonly traded singles in the
                  established U.S. hobby market.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What happens if I receive the wrong item?</h3>
                <p>
                  Contact us within the return window in our <Link href="/returns" className="text-blue-600 underline">Return Policy</Link>.
                  Include your order number and photos of what you received so we can resolve it quickly.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How do returns work?</h3>
                <p>
                  See our full <Link href="/returns" className="text-blue-600 underline">Return &amp; Refund Policy</Link> for the
                  return window, eligible items, return shipping responsibility, and how refunds are issued.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Truck className="w-6 h-6 text-blue-600" />
                Questions Before You Buy?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>If you would like more information about a specific listing before purchasing, please reach out.</p>
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <a href="mailto:cs@tcglore.com" className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Mail className="w-4 h-4" />
                  cs@tcglore.com
                </a>
                <a href="tel:+13036683245" className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Phone className="w-4 h-4" />
                  +1 (303) 668-3245
                </a>
              </div>
              <p className="text-sm text-gray-500 pt-4">
                TCG Lore is an online trading card store operated by A Toy Haulerz LLC.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
