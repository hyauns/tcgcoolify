/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next"
import { Package, RefreshCw, CreditCard, User, HelpCircle, Star, Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"

export const metadata: Metadata = {
  title: "FAQ - Frequently Asked Questions | TCG Lore",
  description:
    "Find answers to common questions about orders, shipping, returns, payments, and product information at TCG Lore.",
}

interface FAQ {
  question: string
  answer: string
}

interface FAQCategory {
  title: string
  iconName: string
  faqs: FAQ[]
}

const faqData: FAQCategory[] = [
  {
    title: "Orders & Shipping",
    iconName: "Package",
    faqs: [
      {
        question: "How long does shipping take?",
        answer:
          "Most in-stock orders are typically processed within 1–2 business days. Standard shipping takes 5–7 business days within the continental US. Express (2–3 business days) and overnight options are also available. Delivery estimates are not guarantees and may vary by carrier, address, weather, holidays, or high-volume periods.",
      },
      {
        question: "Do you offer free shipping?",
        answer:
          "Yes! We offer free standard shipping on orders over $75 within the US. For orders under $75, standard shipping starts at $4.99.",
      },
      {
        question: "Can I track my order?",
        answer:
          "Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account and visiting the 'My Orders' section.",
      },
      {
        question: "What if my order arrives damaged?",
        answer:
          "We're sorry if your order arrives damaged! Please contact us at cs@tcglore.com within 48 hours of delivery with photos of the damaged items. We'll arrange for a replacement or refund.",
      },
      {
        question: "Can I change or cancel my order?",
        answer:
          "Orders can be modified or cancelled within 1 hour of placement. After that, orders enter our fulfillment process and cannot be changed. Please contact customer service immediately if you need to make changes.",
      },
    ],
  },
  {
    title: "Returns & Exchanges",
    iconName: "RefreshCw",
    faqs: [
      {
        question: "What is your return policy?",
        answer:
          "We accept returns within 30 days of delivery for unopened products in original condition. Sealed trading card products must remain unopened. Opened booster packs, booster boxes, or individual cards cannot be returned due to the nature of collectible products.",
      },
      {
        question: "How do I return an item?",
        answer:
          "Contact our customer service team at cs@tcglore.com or call +1 (303) 668-3245 to initiate a return. We'll provide an RMA number and packaging instructions. Refunds are processed within 5–7 business days after we receive and inspect your return.",
      },
      {
        question: "Who pays for return shipping?",
        answer:
          "We provide free return shipping for defective items or our errors. For other returns, a return shipping fee may be deducted from your refund.",
      },
      {
        question: "Can I return opened card packs?",
        answer:
          "Opened trading card packs, booster boxes, or individual cards cannot be returned due to the nature of collectible products. We only accept returns for unopened, sealed products in original condition.",
      },
    ],
  },
  {
    title: "Product Information",
    iconName: "Star",
    faqs: [
      {
        question: "How are your products sourced?",
        answer:
          "TCG Lore sources sealed trading card products through U.S.-based supplier and distributor networks. Products are inspected before shipment to confirm packaging condition and order accuracy.",
      },
      {
        question: "What condition are your products in?",
        answer:
          "All sealed products are stored and inspected before shipment. Any condition issues are clearly noted in product descriptions.",
      },
      {
        question: "Do you offer pre-orders?",
        answer:
          "Yes! We offer pre-orders for upcoming releases. Your payment method may be authorized at checkout. The final charge is captured when the item is prepared for shipment, typically around the release date. You'll receive email updates about any changes.",
      },
      {
        question: "Can I get a specific card from a pack?",
        answer:
          "Trading card packs contain randomized cards, so we cannot guarantee specific cards. Each pack's contents are determined by the manufacturer's randomization process.",
      },
    ],
  },
  {
    title: "Account Management",
    iconName: "User",
    faqs: [
      {
        question: "How do I create an account?",
        answer:
          "Click 'Sign Up' in the top right corner of any page. You'll need to provide your email address, create a password, and verify your email. Having an account allows you to track orders, save favorites, and checkout faster.",
      },
      {
        question: "I forgot my password. How do I reset it?",
        answer:
          "Click 'Sign In' then 'Forgot Password' on the login page. Enter your email address and we'll send you a secure link to reset your password. The link expires after 24 hours for security.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Please contact our customer service team at cs@tcglore.com to request account deletion. We'll remove your personal information within 30 days, though we may retain order history for legal and business purposes.",
      },
    ],
  },
  {
    title: "Payment & Billing",
    iconName: "CreditCard",
    faqs: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept Visa, Mastercard, American Express, and Discover credit cards. All payments are processed securely through encrypted connections.",
      },
      {
        question: "When will I be charged?",
        answer:
          "Your payment method may be authorized at checkout. The final charge is captured when your order is prepared for shipment. For pre-orders, payment is captured when the item becomes available. If there are any issues, we'll contact you before processing.",
      },
      {
        question: "Is my payment information secure?",
        answer:
          "We use secure payment processing. We never store your complete credit card information on our servers — all payment processing is handled by certified payment processors.",
      },
    ],
  },
  {
    title: "General Questions",
    iconName: "HelpCircle",
    faqs: [
      {
        question: "How can I contact customer service?",
        answer:
          "You can reach us through our Contact page, email us at cs@tcglore.com, or call us at +1 (303) 668-3245 Monday–Friday 9 AM to 6 PM EST. We typically respond to emails within 24 hours.",
      },
      {
        question: "Do you ship internationally?",
        answer:
          "Currently, we ship within the United States only, including all 50 states, Washington D.C., and US territories.",
      },
      {
        question: "Who operates TCG Lore?",
        answer:
          "TCG Lore is an online trading card store operated by A Toy Haulerz LLC, based in Flagler Beach, Florida. TCG Lore is not affiliated with, endorsed by, or officially sponsored by game publishers unless explicitly stated. Brand and publisher names are used solely to identify compatible products.",
      },
    ],
  },
]

const iconMap: Record<string, React.ReactNode> = {
  Package: <Package className="w-5 h-5" />,
  RefreshCw: <RefreshCw className="w-5 h-5" />,
  CreditCard: <CreditCard className="w-5 h-5" />,
  User: <User className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-blue-100 mb-4 max-w-2xl mx-auto">
              Find answers to common questions about orders, shipping, returns, and more
            </p>
          </div>
        </div>

        {/* FAQ Content — all answers are in the initial server-rendered HTML */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-8">
            {faqData.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="shadow-lg">
                <CardContent className="p-0">
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{iconMap[category.iconName]}</div>
                      <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
                      <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {category.faqs.length} questions
                      </span>
                    </div>
                  </div>

                  {/* FAQ Items — using <details> for SSR-friendly accordions */}
                  <div className="divide-y divide-gray-200">
                    {category.faqs.map((faq, faqIndex) => (
                      <details key={faqIndex} className="group" open={faqIndex === 0}>
                        <summary className="p-6 cursor-pointer list-none flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors [&::-webkit-details-marker]:hidden">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {faq.question}
                          </h3>
                          <svg
                            className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-transform group-open:rotate-180 flex-shrink-0"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="px-6 pb-6 text-gray-700 leading-relaxed">
                          {faq.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Section */}
          <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Still need help?</h3>
              </div>
              <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
                Can't find the answer you're looking for? Our customer service team is here to help you with any
                questions or concerns.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Contact Support
                </a>
                <a
                  href="mailto:cs@tcglore.com"
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors font-medium"
                >
                  Email Us
                </a>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                TCG Lore is operated by A Toy Haulerz LLC · cs@tcglore.com · +1 (303) 668-3245
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
