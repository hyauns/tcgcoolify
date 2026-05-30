/* eslint-disable react/no-unescaped-entities */
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import Link from "next/link"

export default function TermsOfService() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                Welcome to TCG Lore, an online trading card store operated by TOY HAULERZ LLC ("we," "our," "us," or "Company"). These Terms of Service
                ("Terms") govern your use of our website, mobile application, and services (collectively, the
                "Service"). By accessing or using our Service, you agree to be bound by these Terms.
              </p>
              <p className="text-gray-700">
                If you do not agree to these Terms, please do not use our Service. We reserve the right to modify these
                Terms at any time, and your continued use constitutes acceptance of any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                We operate an e-commerce platform specializing in trading card games, collectible cards, booster packs,
                accessories, and related merchandise. Our services include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Online retail sales of trading cards and gaming accessories</li>
                <li>Pre-order services for upcoming releases</li>
                <li>User account management and order tracking</li>
                <li>Customer support and product information</li>
                <li>Wishlist and recommendation features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts and Eligibility</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.1 Account Creation</h3>
              <p className="text-gray-700 mb-4">
                To make purchases, you must create an account and provide accurate, complete information. You are
                responsible for maintaining the confidentiality of your account credentials and for all activities under
                your account.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.2 Eligibility</h3>
              <p className="text-gray-700 mb-4">
                You must be at least 13 years old to create an account. Users under 18 must have parental consent. By
                creating an account, you represent that you meet these requirements.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.3 Account Security</h3>
              <p className="text-gray-700 mb-4">
                You must immediately notify us of any unauthorized use of your account. We are not liable for losses
                resulting from unauthorized account access due to your failure to maintain account security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use Policy</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Permitted Uses</h3>
              <p className="text-gray-700 mb-4">You may use our Service for lawful purposes only, including:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Browsing and purchasing products</li>
                <li>Managing your account and orders</li>
                <li>Communicating with customer service</li>
                <li>Leaving product reviews and feedback</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Prohibited Activities</h3>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use automated systems (bots) to access the Service</li>
                <li>Resell products for commercial purposes without authorization</li>
                <li>Submit false or misleading information</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Products and Pricing</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 Product Information</h3>
              <p className="text-gray-700 mb-4">
                We strive to provide accurate product descriptions, images, and pricing. However, we do not warrant that
                product descriptions or other content is accurate, complete, or error-free. Colors and details may vary
                from images displayed.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.2 Collectible Card Conditions</h3>
              <p className="text-gray-700 mb-4">
                Trading cards are sold in various conditions (Near Mint, Lightly Played, Moderately Played, Heavily
                Played, Damaged). Condition descriptions are subjective and based on industry standards. We provide
                detailed condition guidelines, but individual card assessment may vary.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.3 Pricing and Availability</h3>
              <p className="text-gray-700 mb-4">
                Prices are subject to change without notice. We reserve the right to modify prices, discontinue
                products, or limit quantities. In case of pricing errors, we may cancel orders and refund payments.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.4 Product Sourcing</h3>
              <p className="text-gray-700 mb-4">
                We source our products through U.S.-based supplier and distributor networks. Products are inspected before shipment to confirm packaging condition and order accuracy. If you have a concern about a product, please contact us for a review and potential replacement or refund.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Orders and Payment</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 Order Process</h3>
              <p className="text-gray-700 mb-4">
                Orders are subject to acceptance and availability. We reserve the right to refuse or cancel orders for
                any reason, including suspected fraud, product unavailability, or pricing errors.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 Payment Terms</h3>
              <p className="text-gray-700 mb-4">
                Payment is due at the time of order placement. We accept major credit cards, PayPal, and other approved
                payment methods. All payments are processed securely through encrypted payment gateways.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.3 Pre-Orders</h3>
              <p className="text-gray-700 mb-4">
                Pre-order items are charged at the time of order placement. Release dates are estimates and subject to
                change. You may cancel pre-orders up to 48 hours before the scheduled release date. For more details,
                see our{" "}
                <Link href="/preorder-info" className="text-blue-600 hover:text-blue-800">
                  Pre-Order Policy
                </Link>
                .
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.4 Taxes</h3>
              <p className="text-gray-700 mb-4">
                Applicable taxes will be calculated and added to your order total based on your shipping address and
                local tax laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Shipping and Delivery</h2>
              <p className="text-gray-700 mb-4">
                Shipping terms, costs, and delivery timeframes are detailed on our{" "}
                <Link href="/shipping" className="text-blue-600 hover:text-blue-800">
                  Shipping Information
                </Link>{" "}
                page. Key points include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Orders are processed within 1-2 business days</li>
                <li>Shipping costs are calculated based on weight, size, and destination</li>
                <li>We are not responsible for delays caused by shipping carriers</li>
                <li>Risk of loss transfers to you upon delivery to the carrier</li>
                <li>International shipping may be subject to customs duties and taxes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Returns and Exchanges</h2>
              <p className="text-gray-700 mb-4">
                Our return and exchange policy is detailed on our{" "}
                <Link href="/returns" className="text-blue-600 hover:text-blue-800">
                  Returns & Exchanges
                </Link>{" "}
                page. Summary:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Returns accepted within 30 days of delivery</li>
                <li>Items must be in original condition and packaging</li>
                <li>Opened booster packs and single cards cannot be returned unless defective</li>
                <li>Return shipping costs are the customer's responsibility unless the item is defective</li>
                <li>Refunds processed within 5-7 business days after receiving returned items</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property Rights</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.1 Our Content</h3>
              <p className="text-gray-700 mb-4">
                All content on our Service, including text, graphics, logos, images, and software, is owned by us or our
                licensors and protected by copyright, trademark, and other intellectual property laws.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.2 Trading Card Copyrights</h3>
              <p className="text-gray-700 mb-4">
                Trading card games, artwork, and related intellectual property are owned by their respective publishers
                (e.g., Wizards of the Coast, Konami, Bushiroad). TCG Lore is not affiliated with, endorsed by, or officially sponsored by these publishers unless explicitly stated. Brand and publisher names are used solely to identify compatible products.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.3 User Content</h3>
              <p className="text-gray-700 mb-4">
                By submitting reviews, comments, or other content, you grant us a non-exclusive, royalty-free license to
                use, modify, and display such content in connection with our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Our collection, use, and protection of your personal information is
                governed by our{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Disclaimers and Limitations of Liability
              </h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">11.1 Service Disclaimer</h3>
              <p className="text-gray-700 mb-4">
                Our Service is provided &quot;as is&quot; and "as available" without warranties of any kind, either express or
                implied. We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">11.2 Product Disclaimers</h3>
              <p className="text-gray-700 mb-4">
                We disclaim all warranties regarding product condition, performance, or suitability for particular
                purposes, except as expressly stated in our product descriptions or required by law.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">11.3 Limitation of Liability</h3>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, our total liability for any claims arising from your use of the
                Service shall not exceed the amount you paid for the specific product or service giving rise to the
                claim.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">11.4 Exclusion of Damages</h3>
              <p className="text-gray-700 mb-4">
                We shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
                including lost profits, data loss, or business interruption.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses arising from
                your use of the Service, violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Dispute Resolution</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">13.1 Informal Resolution</h3>
              <p className="text-gray-700 mb-4">
                Before initiating formal proceedings, we encourage you to contact our customer service team to resolve
                disputes informally.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">13.2 Binding Arbitration</h3>
              <p className="text-gray-700 mb-4">
                Any disputes that cannot be resolved informally shall be settled through binding arbitration in
                accordance with the rules of the American Arbitration Association. The arbitration shall take place in
                Florida, United States.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">13.3 Class Action Waiver</h3>
              <p className="text-gray-700 mb-4">
                You agree to resolve disputes individually and waive any right to participate in class action lawsuits
                or class-wide arbitration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the Service at any time, with or without notice,
                for violation of these Terms or other reasons we deem appropriate. You may terminate your account by
                contacting customer service.
              </p>
              <p className="text-gray-700">
                Upon termination, your right to use the Service ceases immediately, but these Terms shall remain in
                effect regarding past use and any ongoing obligations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms are governed by and construed in accordance with the laws of Florida, United States, without
                regard to conflict of law principles. Any legal action must be brought in the courts of Flagler County, Florida.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Severability</h2>
              <p className="text-gray-700 mb-4">
                If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in
                full force and effect, and the unenforceable provision shall be replaced with an enforceable provision
                that most closely reflects our intent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon
                posting on our website. We will notify users of material changes via email or prominent website notice.
              </p>
              <p className="text-gray-700">
                Your continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> <a href="mailto:cs@tcglore.com">cs@tcglore.com</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Phone:</strong> <a href="tel:+18884961626">(888) 496-1626</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Mail:</strong> Legal Department, TCG Lore, 1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136, United States
                </p>
                <p className="text-gray-700">
                  <strong>Contact Form:</strong>{" "}
                  <Link href="/contact" className="text-blue-600 hover:text-blue-800">
                    Visit our contact page
                  </Link>
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">19. Additional Policies</h2>
              <p className="text-gray-700 mb-4">
                These Terms incorporate the following additional policies by reference:
              </p>
              <ul className="list-disc pl-6 text-gray-700">
                <li>
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-800">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/shipping" className="text-blue-600 hover:text-blue-800">
                    Shipping Information
                  </Link>
                </li>
                <li>
                  <Link href="/returns" className="text-blue-600 hover:text-blue-800">
                    Returns & Exchanges Policy
                  </Link>
                </li>
                <li>
                  <Link href="/preorder-info" className="text-blue-600 hover:text-blue-800">
                    Pre-Order Policy
                  </Link>
                </li>
                <li>
                  <Link href="/payment-and-orders" className="text-blue-600 hover:text-blue-800">
                    Payment & Orders Information
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}


