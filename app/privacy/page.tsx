/* eslint-disable react/no-unescaped-entities */
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"
import Link from "next/link"

export default function PrivacyPolicy() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Welcome to TCG Lore, an online trading card store operated by A Toy Haulerz LLC ("we," "our," or "us"). We are committed to protecting your
                privacy and ensuring the security of your personal information. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you visit our website and make purchases
                from our online store.
              </p>
              <p className="text-gray-700">
                By using our website, you consent to the data practices described in this policy. This policy complies
                with applicable data protection laws, including the General Data Protection Regulation (GDPR) and the
                California Consumer Privacy Act (CCPA).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">We collect the following types of personal information:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Account Information:</strong> Name, email address, username, password, date of birth
                </li>
                <li>
                  <strong>Contact Information:</strong> Billing and shipping addresses, phone number
                </li>
                <li>
                  <strong>Payment Information:</strong> Credit card details, billing information (processed securely
                  through our payment processors)
                </li>
                <li>
                  <strong>Purchase History:</strong> Order details, transaction records, product preferences
                </li>
                <li>
                  <strong>Communication Data:</strong> Customer service interactions, reviews, feedback
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Automatically Collected Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Device Information:</strong> IP address, browser type, operating system, device identifiers
                </li>
                <li>
                  <strong>Usage Data:</strong> Pages visited, time spent on site, click patterns, search queries
                </li>
                <li>
                  <strong>Cookies and Tracking:</strong> Session cookies, preference cookies, analytics cookies
                </li>
                <li>
                  <strong>Location Data:</strong> General geographic location based on IP address
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Order Fulfillment:</strong> Processing payments, managing orders, arranging shipping and
                  delivery
                </li>
                <li>
                  <strong>Account Management:</strong> Creating and maintaining user accounts, authentication, customer
                  support
                </li>
                <li>
                  <strong>Personalization:</strong> Providing personalized product recommendations, customized shopping
                  experience
                </li>
                <li>
                  <strong>Marketing Communications:</strong> Sending promotional emails, newsletters, special offers
                  (with your consent)
                </li>
                <li>
                  <strong>Analytics and Improvement:</strong> Analyzing website usage, improving our services,
                  developing new features
                </li>
                <li>
                  <strong>Legal Compliance:</strong> Meeting legal obligations, preventing fraud, enforcing our terms
                </li>
                <li>
                  <strong>Customer Service:</strong> Responding to inquiries, resolving disputes, providing support
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">We may share your information with:</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Service Providers</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Payment Processors:</strong> secure Credit Card processing gateways
                </li>
                <li>
                  <strong>Shipping Partners:</strong> USPS, UPS, FedEx, DHL for order delivery
                </li>
                <li>
                  <strong>Email Services:</strong> For sending transactional and marketing emails
                </li>
                <li>
                  <strong>Analytics Providers:</strong> Google Analytics, other web analytics services
                </li>
                <li>
                  <strong>Customer Support:</strong> Third-party customer service platforms
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information when required by law, court order, or government request, or to protect
                our rights, property, or safety.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.3 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new
                entity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement comprehensive security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>
                  <strong>Encryption:</strong> SSL/TLS encryption for data transmission
                </li>
                <li>
                  <strong>Secure Storage:</strong> Encrypted databases and secure servers
                </li>
                <li>
                  <strong>Access Controls:</strong> Limited access to personal information on a need-to-know basis
                </li>
                <li>
                  <strong>Regular Audits:</strong> Security assessments and vulnerability testing
                </li>
                <li>
                  <strong>PCI Compliance:</strong> Payment Card Industry Data Security Standard compliance
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.1 Access and Portability</h3>
              <p className="text-gray-700 mb-4">
                You can request access to your personal information and receive a copy in a portable format.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.2 Rectification</h3>
              <p className="text-gray-700 mb-4">
                You can update or correct your personal information through your account settings or by contacting us.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.3 Deletion</h3>
              <p className="text-gray-700 mb-4">
                You can request deletion of your personal information, subject to legal retention requirements.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.4 Marketing Opt-out</h3>
              <p className="text-gray-700 mb-4">
                You can unsubscribe from marketing communications at any time using the unsubscribe link in emails or
                through your account settings.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">6.5 Cookie Management</h3>
              <p className="text-gray-700 mb-4">
                You can manage cookie preferences through your browser settings or our cookie consent tool.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 mb-4">We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Remember your preferences and settings</li>
                <li>Maintain your shopping cart contents</li>
                <li>Analyze website traffic and user behavior</li>
                <li>Provide personalized content and advertisements</li>
                <li>Ensure website security and prevent fraud</li>
              </ul>
              <p className="text-gray-700">
                You can control cookies through your browser settings, but disabling certain cookies may affect website
                functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
              <p className="text-gray-700 mb-4">We retain your information for as long as necessary to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide our services and fulfill transactions</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain business records for tax and accounting purposes</li>
              </ul>
              <p className="text-gray-700">
                Account information is typically retained for 7 years after account closure, while transaction records
                are kept for 10 years as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure
                appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Adequacy decisions for countries with equivalent data protection laws</li>
                <li>Certification schemes and codes of conduct</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our services are not directed to children under 13 years of age. We do not knowingly collect personal
                information from children under 13. If we become aware that we have collected information from a child
                under 13, we will take steps to delete such information promptly.
              </p>
              <p className="text-gray-700">
                For users between 13 and 18, parental consent may be required for certain activities as per applicable
                laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Links</h2>
              <p className="text-gray-700">
                Our website may contain links to third-party websites. We are not responsible for the privacy practices
                of these external sites. We encourage you to review their privacy policies before providing any personal
                information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws.
                We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Posting the updated policy on our website</li>
                <li>Sending email notifications to registered users</li>
                <li>Displaying prominent notices on our website</li>
              </ul>
              <p className="text-gray-700">
                Your continued use of our services after changes become effective constitutes acceptance of the updated
                policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> <a href="mailto:cs@tcglore.com">cs@tcglore.com</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Phone:</strong> <a href="tel:+13036683245">+1 (303) 668-3245</a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Mail:</strong> Privacy Officer, TCG Lore, 1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136, United States
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Compliance and Certifications</h2>
              <p className="text-gray-700 mb-4">Our privacy practices comply with:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>General Data Protection Regulation (GDPR)</li>
                <li>California Consumer Privacy Act (CCPA)</li>
                <li>Payment Card Industry Data Security Standard (PCI DSS)</li>
                <li>Google Merchant Center policies and guidelines</li>
                <li>CAN-SPAM Act for email communications</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}


