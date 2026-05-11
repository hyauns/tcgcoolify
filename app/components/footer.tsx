import Link from "next/link"
import Image from "next/image"
import { Mail, Phone, MapPin } from "lucide-react"
import { FooterSocial } from "./footer-social"

import { ManageCookiesButton } from "./manage-cookies-button"

export function Footer() {
  return (
    <footer className="text-white" style={{ backgroundColor: "rgb(241, 245, 249)" }}>
      <div className="container mx-auto px-4 py-12" style={{ backgroundColor: "rgb(241, 245, 249)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex flex-col items-start gap-1">
              <Image 
                src="/logo.png" 
                alt="TCG Lore Logo" 
                width={120} 
                height={40} 
                className="h-10 w-auto object-contain"
              />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                TCG Lore is an online trading card store operated by A Toy Haulerz LLC.
              </span>
            </div>
            <p className="text-black text-sm leading-relaxed hover:text-[rgb(37,99,235)] transition-colors">
              We source sealed trading card products through U.S. supplier and distributor networks. Orders are reviewed and packed carefully before shipment. Product condition and availability are clearly shown before checkout.
            </p>
            <FooterSocial />
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black hover:text-[rgb(37,99,235)] transition-colors">
              Quick Links
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/preorder-info"
                  className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm"
                >
                  Pre-Orders
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/account" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black hover:text-[rgb(37,99,235)] transition-colors">
              Customer Service
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link
                  href="/best-price-guarantee"
                  className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm"
                >
                  Best Price Guarantee
                </Link>
              </li>
              <li>
                <Link
                  href="/payment"
                  className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm"
                >
                  Payment & Orders Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black hover:text-[rgb(37,99,235)] transition-colors">
              Get in Touch
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-black hover:text-[rgb(37,99,235)] transition-colors" />
                <a href="mailto:cs@tcglore.com" className="text-black text-sm hover:text-[rgb(37,99,235)] transition-colors">
                  cs@tcglore.com
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-black hover:text-[rgb(37,99,235)] transition-colors mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Remote Customer Support Line</span>
                  <a href="tel:+13036683245" className="text-black text-sm hover:text-[rgb(37,99,235)] transition-colors">+1 (303) 668-3245</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-black hover:text-[rgb(37,99,235)] transition-colors flex-shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Business Office</span>
                  <span className="text-black text-sm hover:text-[rgb(37,99,235)] transition-colors leading-tight">
                    1757 NORTH CENTRAL AVENUE<br />FLAGLER BEACH, FL 32136
                  </span>
                </div>
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2 text-black hover:text-[rgb(37,99,235)] transition-colors">
                Stay Updated
              </h4>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 bg-white"
                />
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors text-white">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Image src="/images/visa.svg" alt="Visa" width={32} height={20} className="h-5 w-auto" />
                <Image src="/images/mastercard.svg" alt="Mastercard" width={32} height={20} className="h-5 w-auto" />
                <Image src="/images/amex.svg" alt="American Express" width={32} height={20} className="h-5 w-auto" />
                <Image src="/images/discover.svg" alt="Discover" width={32} height={20} className="h-5 w-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-black text-sm hover:text-[rgb(37,99,235)] transition-colors">
            © {new Date().getFullYear()} TCG Lore. Operated by A Toy Haulerz LLC.
          </p>

          {/* Trading Card Game Copyright Information */}
          <div className="mt-4 space-y-2 text-xs text-black">
            <p>
              <Link
                href="https://magic.wizards.com/en"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[rgb(37,99,235)] transition-colors font-bold underline"
              >
                Magic: The Gathering
              </Link>{" "}
              and its respective properties are ©{" "}
              <Link
                href="http://company.wizards.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[rgb(37,99,235)] transition-colors font-bold underline"
              >
                Wizards of the Coast
              </Link>
              .
            </p>
            <p>
              <Link
                href="http://www.yugioh-card.com/en/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[rgb(37,99,235)] transition-colors font-bold underline"
              >
                Yu-Gi-Oh!
              </Link>{" "}
              and its respective properties are © 2025 Studio Dice/SHUEISHA, TV TOKYO, KONAMI.
            </p>
            <p>
              © 2024{" "}
              <Link
                href="https://www.pokemon.com/us/pokemon-tcg/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[rgb(37,99,235)] transition-colors font-bold underline"
              >
                Pokémon
              </Link>
              . ©1995 - 2024 Nintendo/Creatures Inc./GAME FREAK Inc. TM, ®Nintendo.
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <Link
              href="/privacy"
              className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 30 14"
                height="16"
                width="16"
                className="privacy-icon flex-shrink-0 text-transparent"
              >
                <path
                  d="M7.4 12.8h6.8l3.1-11.6H7.4C4.2 1.2 1.6 3.8 1.6 7s2.6 5.8 5.8 5.8"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
                <path className="bg-white text-transparent"
                  d="M22.6 0H7.4c-3.9 0-7 3.1-7 7s3.1 7 7 7h15.2c3.9 0 7-3.1 7-7s-3.2-7-7-7m-21 7c0-3.2 2.6-5.8 5.8-5.8h9.9l-3.1 11.6H7.4c-3.2 0-5.8-2.6-5.8-5.8"
                  fill="#06f"
                  fillRule="evenodd"
                  clipRule="evenodd"
                />
                <path
                  d="M24.6 4c.2.2.2.6 0 .8L22.5 7l2.2 2.2c.2.2.2.6 0 .8s-.6.2-.8 0l-2.2-2.2-2.2 2.2c-.2.2-.6.2-.8 0s-.2-.6 0-.8L20.8 7l-2.2-2.2c-.2-.2-.2-.6 0-.8s.6-.2.8 0l2.2 2.2L23.8 4c.2-.2.6-.2.8 0"
                  fill="#fff"
                />
                <path
                  d="M12.7 4.1c.2.2.3.6.1.8L8.6 9.8c-.1.1-.2.2-.3.2-.2.1-.5.1-.7-.1L5.4 7.7c-.2-.2-.2-.6 0-.8s.6-.2.8 0L8 8.6l3.8-4.5c.2-.2.6-.2.9 0"
                  fill="#06f"
                />
              </svg>
              Privacy Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/terms" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
              Terms of Service
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/cookies" className="text-black hover:text-[rgb(37,99,235)] transition-colors text-sm">
              Cookie Policy
            </Link>
            <span className="text-gray-600">|</span>
            <ManageCookiesButton />
          </div>
        </div>
      </div>
    </footer>
  )
}

