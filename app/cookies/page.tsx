/* eslint-disable react/no-unescaped-entities */
"use client"

import { useEffect } from "react"
import { Header } from "@/app/components/header"
import { Footer } from "@/app/components/footer"

export default function CookiesPage() {
  useEffect(() => {
    // Ensure page starts at top
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last Updated:</strong> January 2024
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">What Are Cookies?</h2>
              <p className="text-gray-700 mb-4">
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit
                our website. They help us provide you with a better browsing experience by remembering your preferences,
                analyzing how you use our site, and enabling certain functionality.
              </p>
              <p className="text-gray-700 mb-4">
                Cookies contain information that is transferred to your device's hard drive. They help us improve our
                services and deliver a more personalized and convenient experience when you visit our TCG Lore store.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Types of Cookies We Use</h2>

              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Essential Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies are necessary for the website to function properly and cannot be disabled in our
                    systems.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Authentication and login status</li>
                    <li>Shopping cart contents</li>
                    <li>Security and fraud prevention</li>
                    <li>Website functionality and navigation</li>
                    <li>Load balancing and performance optimization</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Functional Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies enable enhanced functionality and personalization, such as remembering your
                    preferences.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Language and region preferences</li>
                    <li>Display preferences (grid/list view)</li>
                    <li>Recently viewed products</li>
                    <li>Wishlist items</li>
                    <li>Search filters and sorting preferences</li>
                    <li>Newsletter subscription preferences</li>
                  </ul>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytical Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies help us understand how visitors interact with our website by collecting and reporting
                    information anonymously.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Website traffic analysis</li>
                    <li>Page views and session duration</li>
                    <li>User behavior patterns</li>
                    <li>Popular products and categories</li>
                    <li>Error tracking and performance monitoring</li>
                    <li>A/B testing for website improvements</li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Marketing Cookies</h3>
                  <p className="text-gray-700 mb-2">
                    These cookies are used to deliver personalized advertisements and track the effectiveness of our
                    marketing campaigns.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Personalized product recommendations</li>
                    <li>Targeted advertising based on interests</li>
                    <li>Social media integration</li>
                    <li>Email marketing personalization</li>
                    <li>Retargeting campaigns</li>
                    <li>Conversion tracking</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-700 mb-4">
                We work with trusted third-party service providers who may place cookies on your device to help us
                provide our services:
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Google Analytics</h4>
                  <p className="text-gray-700 text-sm">
                    Helps us understand website usage patterns and improve user experience.
                    <a
                      href="https://policies.google.com/privacy"
                      className="text-blue-600 hover:underline ml-1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Privacy Policy
                    </a>
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Payment Processors</h4>
                  <p className="text-gray-700 text-sm">
                    Secure payment processing services use cookies for fraud prevention and transaction
                    security.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Social Media Platforms</h4>
                  <p className="text-gray-700 text-sm">
                    Facebook, Twitter, Instagram, and YouTube cookies enable social sharing and embedded content.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Advertising Partners</h4>
                  <p className="text-gray-700 text-sm">
                    Google Ads, Facebook Ads, and other advertising platforms use cookies for targeted advertising and
                    conversion tracking.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Customer Support</h4>
                  <p className="text-gray-700 text-sm">
                    Live chat and customer support tools use cookies to maintain conversation history and provide better
                    assistance.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How to Manage Cookies</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Browser Settings</h3>
                  <p className="text-gray-700 mb-4">
                    You can control and manage cookies through your browser settings. Most browsers allow you to:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                    <li>View cookies stored on your device</li>
                    <li>Delete existing cookies</li>
                    <li>Block cookies from specific websites</li>
                    <li>Block all cookies</li>
                    <li>Set preferences for different types of cookies</li>
                  </ul>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Browser-Specific Instructions:</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>
                        <strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data
                      </li>
                      <li>
                        <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
                      </li>
                      <li>
                        <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
                      </li>
                      <li>
                        <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Opt-Out Options</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>
                      <strong>Google Analytics:</strong> Use the
                      <a
                        href="https://tools.google.com/dlpage/gaoptout"
                        className="text-blue-600 hover:underline ml-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google Analytics Opt-out Browser Add-on
                      </a>
                    </li>
                    <li>
                      <strong>Advertising Cookies:</strong> Visit
                      <a
                        href="http://www.aboutads.info/choices/"
                        className="text-blue-600 hover:underline ml-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Digital Advertising Alliance
                      </a>{" "}
                      or
                      <a
                        href="http://www.youronlinechoices.eu/"
                        className="text-blue-600 hover:underline ml-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Your Online Choices
                      </a>
                    </li>
                    <li>
                      <strong>Social Media:</strong> Adjust privacy settings directly on each platform
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Important Note:</strong> Disabling certain cookies may affect website functionality.
                      Essential cookies cannot be disabled as they are necessary for the website to work properly.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookie Retention</h2>
              <p className="text-gray-700 mb-4">Different cookies have different lifespans:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>
                  <strong>Session Cookies:</strong> Deleted when you close your browser
                </li>
                <li>
                  <strong>Persistent Cookies:</strong> Remain on your device for a set period (typically 30 days to 2
                  years)
                </li>
                <li>
                  <strong>Essential Cookies:</strong> Retained only as long as necessary for website functionality
                </li>
                <li>
                  <strong>Marketing Cookies:</strong> Typically expire after 30-90 days
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">
                Under applicable privacy laws (GDPR, CCPA, etc.), you have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Know what cookies are being used and why</li>
                <li>Give or withdraw consent for non-essential cookies</li>
                <li>Access information about cookies stored on your device</li>
                <li>Request deletion of cookies (where technically possible)</li>
                <li>Object to the use of cookies for marketing purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Updates to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices, technology,
                legal requirements, or other factors. We will notify you of any material changes by:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li>Posting the updated policy on our website</li>
                <li>Updating the "Last Updated" date at the top of this policy</li>
                <li>Sending email notifications for significant changes (if you have an account)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="space-y-2 text-gray-700">
                  <li>
                    <strong>Email:</strong> <a href="mailto:cs@tcglore.com">cs@tcglore.com</a>
                  </li>
                  <li>
                    <strong>Phone:</strong> <a href="tel:+18884961626">(888) 496-1626</a>
                  </li>
                  <li>
                    <strong>Mail:</strong> TCG Lore Privacy Team, 1757 NORTH CENTRAL AVENUE, FLAGLER BEACH, FL 32136
                  </li>
                  <li>
                    <strong>Contact Form:</strong>{" "}
                    <a href="/contact" className="text-blue-600 hover:underline">
                      Visit our Contact Page
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    For more information about how we handle your personal data, please review our
                    <a href="/privacy" className="font-medium underline ml-1">
                      Privacy Policy
                    </a>{" "}
                    and
                    <a href="/terms" className="font-medium underline ml-1">
                      Terms of Service
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}


