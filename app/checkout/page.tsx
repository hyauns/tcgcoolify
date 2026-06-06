/* eslint-disable react/no-unescaped-entities */
"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Lock,
  MapPin,
  Package,
  Shield,
  Star,
  Truck,
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  AlertCircle,
  CheckCircle,
  Zap,
  Clock,
  Award,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Script from "next/script"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

// Google Places API types
interface PlacePrediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

interface AddressComponents {
  street_number?: string
  route?: string
  locality?: string
  administrative_area_level_1?: string
  postal_code?: string
  country?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

// US State abbreviations for validation
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC", // District of Columbia
]

// Phone number validation and formatting
const validatePhone = (phone: string) => {
  const digitsOnly = phone.replace(/\D/g, "")
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith("1"))
}

const formatPhoneNumber = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "")

  if (digitsOnly.length <= 3) {
    return digitsOnly
  } else if (digitsOnly.length <= 6) {
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3)}`
  } else if (digitsOnly.length <= 10) {
    return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    const withoutCountryCode = digitsOnly.substring(1)
    return `+1 (${withoutCountryCode.substring(0, 3)}) ${withoutCountryCode.substring(3, 6)}-${withoutCountryCode.substring(6)}`
  }
  return value
}

// Card number formatting
const formatCardNumber = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "")
  return digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ")
}

// Credit card type detection
const detectCardType = (cardNumber: string) => {
  const digitsOnly = cardNumber.replace(/\D/g, "")

  // Visa: starts with 4
  if (/^4/.test(digitsOnly)) {
    return { type: "visa", logo: "/images/visa.svg", name: "Visa" }
  }

  // Mastercard: starts with 5[1-5] or 2[2-7]
  if (/^5[1-5]/.test(digitsOnly) || /^2[2-7]/.test(digitsOnly)) {
    return { type: "mastercard", logo: "/images/mastercard.svg", name: "Mastercard" }
  }

  // American Express: starts with 34 or 37
  if (/^3[47]/.test(digitsOnly)) {
    return { type: "amex", logo: "/images/amex.svg", name: "American Express" }
  }

  // Discover: starts with 6011, 622[1-9], 64[4-9], or 65
  if (
    /^6011/.test(digitsOnly) ||
    /^622[1-9]/.test(digitsOnly) ||
    /^64[4-9]/.test(digitsOnly) ||
    /^65/.test(digitsOnly)
  ) {
    return { type: "discover", logo: "/images/discover.svg", name: "Discover" }
  }

  return null
}

// Expiry date formatting
const formatExpiryDate = (value: string) => {
  const digitsOnly = value.replace(/\D/g, "")
  if (digitsOnly.length >= 2) {
    return `${digitsOnly.substring(0, 2)}/${digitsOnly.substring(2, 4)}`
  }
  return digitsOnly
}

// Expiry date validation
const validateExpiryDate = (expiryDate: string) => {
  if (!expiryDate || expiryDate.length !== 5) {
    return false
  }

  const [monthStr, yearStr] = expiryDate.split("/")
  const month = Number.parseInt(monthStr, 10)
  const year = Number.parseInt(`20${yearStr}`, 10)

  // Check if month is valid (1-12)
  if (month < 1 || month > 12) {
    return false
  }

  // Get current date
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // getMonth() returns 0-11

  // Check if the expiry date is in the future
  if (year > currentYear) {
    return true
  } else if (year === currentYear) {
    return month > currentMonth
  }

  return false
}

// CVV validation based on card type
const validateCVV = (cvv: string, cardType: string | null) => {
  if (!cvv) return false

  const digitsOnly = cvv.replace(/\D/g, "")

  if (cardType === "amex") {
    return digitsOnly.length === 4
  } else {
    // Visa, Mastercard, Discover
    return digitsOnly.length === 3
  }
}

// Name on card validation
const validateNameOnCard = (name: string) => {
  if (!name || name.trim().length === 0) {
    return false
  }

  // Remove extra spaces and split into words
  const words = name.trim().split(/\s+/)

  // Must have at least 2 words
  if (words.length < 2) {
    return false
  }

  // Check each word contains only letters, hyphens, and spaces
  const nameRegex = /^[a-zA-Z\s-]+$/
  return nameRegex.test(name)
}

// Email validation
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Enhanced address validation functions
const validateStreetAddress = (address: string) => {
  if (!address || address.trim().length === 0) {
    return false
  }

  const trimmedAddress = address.trim()

  // Check for minimum length
  if (trimmedAddress.length < 5) {
    return false
  }

  // Accept USPS PO boxes — e.g. "PO Box 1234", "P.O. Box 1234", "POB 1234",
  // "Post Office Box 1234". They don't begin with a street number, so they
  // must be matched separately from the standard street pattern below.
  const poBoxPattern = /^\s*(p\.?\s*o\.?\s*box|post\s+office\s+box|p\.?\s*o\.?\s*b\b|pob\b)\s*#?\s*\d+\s*$/i
  if (poBoxPattern.test(trimmedAddress)) {
    return true
  }

  // Check for at least one number (street number) and one letter (street name)
  const hasNumber = /\d/.test(trimmedAddress)
  const hasLetter = /[a-zA-Z]/.test(trimmedAddress)

  if (!hasNumber || !hasLetter) {
    return false
  }

  // Check for common street address patterns
  // Should start with a street number, then a street name that may itself
  // contain digits (e.g. "215 W 14th St", "1 1st Ave", "42 42nd St").
  const streetPattern = /^\d+\s+[a-zA-Z0-9\s\-.#,/]+$/
  return streetPattern.test(trimmedAddress)
}

const validateCity = (city: string) => {
  if (!city || city.trim().length === 0) {
    return false
  }

  const trimmedCity = city.trim()

  // Check minimum length
  if (trimmedCity.length < 2) {
    return false
  }

  // Check that it contains only letters, spaces, hyphens, and apostrophes
  const cityPattern = /^[a-zA-Z\s\-'.]+$/
  return cityPattern.test(trimmedCity)
}

const validateState = (state: string) => {
  if (!state || state.trim().length === 0) {
    return false
  }

  const trimmedState = state.trim().toUpperCase()
  return US_STATES.includes(trimmedState)
}

// Enhanced ZIP code validation
const validateZipCode = (zip: string) => {
  if (!zip || zip.trim().length === 0) {
    return false
  }

  const trimmedZip = zip.trim()

  // Check for exact 5-digit format
  const zipPattern = /^\d{5}$/
  return zipPattern.test(trimmedZip)
}

export default function CheckoutPage() {
  const { state } = useCart()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isGuest, setIsGuest] = useState(true)

  // Skip the contact/auth step entirely for already-authenticated users
  useEffect(() => {
    if (isAuthenticated && currentStep === 1) {
      setCurrentStep(2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])
  const [detectedCardType, setDetectedCardType] = useState<{ type: string; logo: string; name: string } | null>(null)

  // Mobile-specific states
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [showCVVHelp, setShowCVVHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  // Address autocomplete states
  const [addressSuggestions, setAddressSuggestions] = useState<PlacePrediction[]>([])
  const [billingAddressSuggestions, setBillingAddressSuggestions] = useState<PlacePrediction[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [showBillingAddressSuggestions, setShowBillingAddressSuggestions] = useState(false)
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = useState(false)
  const [isLoadingBillingAddressSuggestions, setIsLoadingBillingAddressSuggestions] = useState(false)
  const [addressApiError, setAddressApiError] = useState<string | null>(null)
  const [billingAddressApiError, setBillingAddressApiError] = useState<string | null>(null)

  // Payment processing modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStage, setPaymentStage] = useState(0)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Refs for address inputs
  const addressInputRef = useRef<HTMLInputElement>(null)
  const billingAddressInputRef = useRef<HTMLInputElement>(null)
  const addressSuggestionsRef = useRef<HTMLDivElement>(null)
  const billingSuggestionsRef = useRef<HTMLDivElement>(null)
  const formContainerRef = useRef<HTMLDivElement>(null)

  // Google Places API service refs (avoids re-initialization on every keystroke)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const placesServiceDivRef = useRef<HTMLDivElement | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    shippingMethod: "standard",
    paymentMethod: "card",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    billingAddress: "same",
    billingFirstName: "",
    billingLastName: "",
    billingAddressLine: "",
    billingApartment: "",
    billingCity: "",
    billingState: "",
    billingZipCode: "",
    billingCountry: "United States",
    saveInfo: false,
    newsletter: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [calculatedTax, setCalculatedTax] = useState<number | null>(null)
  const [isCalculatingTax, setIsCalculatingTax] = useState(false)
  const [gatewayFlow, setGatewayFlow] = useState<"mock_charge" | "stripe" | "shopify">("mock_charge")

  // Resolve the active gateway flow (mock_charge | stripe | shopify). Both
  // stripe and shopify are hosted REDIRECT flows, so we switch the payment
  // method off "card" — the card form + card validation are skipped and the
  // buyer is redirected to the gateway's hosted page to pay.
  useEffect(() => {
    let cancelled = false
    fetch("/api/checkout/payment-mode")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const raw = d?.flow
        const flow: "mock_charge" | "stripe" | "shopify" =
          raw === "stripe" || raw === "shopify" ? raw : "mock_charge"
        setGatewayFlow(flow)
        const isRedirect = flow !== "mock_charge"
        setFormData((prev) => ({ ...prev, paymentMethod: isRedirect ? "stripe" : "card" }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Mobile detection and keyboard handling
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768)
  }

  useEffect(() => {
    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Handle virtual keyboard on mobile
  useEffect(() => {
    const handleViewportChange = () => {
      if (isMobile) {
        const viewportHeight = window.visualViewport?.height || window.innerHeight
        const windowHeight = window.innerHeight
        const keyboardHeight = windowHeight - viewportHeight
        setKeyboardHeight(keyboardHeight)
      }
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange)
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportChange)
      }
    }
  }, [isMobile])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showPaymentModal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showPaymentModal])

  // Auto-scroll to active input on mobile when keyboard appears
  useEffect(() => {
    if (keyboardHeight > 0 && isMobile) {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && activeElement.tagName === "INPUT") {
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      }
    }
  }, [keyboardHeight, isMobile])

  // Google Places API integration
  // Mapbox session token to group autocomplete queries into a single billing session
  const mapboxSessionTokenRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Generate a simple unique ID for Mapbox session
    if (!mapboxSessionTokenRef.current) {
      mapboxSessionTokenRef.current = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }
  }, [])

  const searchAddresses = async (input: string, isBilling = false) => {
    // Clear any pending debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    if (!input || input.length < 3) {
      if (isBilling) {
        setBillingAddressSuggestions([])
        setShowBillingAddressSuggestions(false)
      } else {
        setAddressSuggestions([])
        setShowAddressSuggestions(false)
      }
      return
    }

    if (isBilling) {
      setIsLoadingBillingAddressSuggestions(true)
      setBillingAddressApiError(null)
    } else {
      setIsLoadingAddressSuggestions(true)
      setAddressApiError(null)
    }

    // Debounce the API call by 300ms to avoid excessive requests
    searchDebounceRef.current = setTimeout(async () => {
      if (!MAPBOX_TOKEN) {
        const errorMessage = "Address suggestions are currently unavailable (missing API token). Please enter your address manually."
        if (isBilling) {
          setBillingAddressApiError(errorMessage)
          setIsLoadingBillingAddressSuggestions(false)
        } else {
          setAddressApiError(errorMessage)
          setIsLoadingAddressSuggestions(false)
        }
        return
      }

      try {
        const sessionToken = mapboxSessionTokenRef.current || 'default-session'
        const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(input)}&access_token=${MAPBOX_TOKEN}&language=en&country=us&session_token=${sessionToken}`)
        const data = await response.json()
        
        if (data.suggestions && data.suggestions.length > 0) {
          const mapped: PlacePrediction[] = data.suggestions.map((p: any) => ({
            place_id: p.mapbox_id || "",
            description: p.full_address || `${p.name}, ${p.place_formatted}`,
            structured_formatting: {
              main_text: p.name || "",
              secondary_text: p.place_formatted || "",
            },
          }))

          if (isBilling) {
            setBillingAddressSuggestions(mapped)
            setShowBillingAddressSuggestions(true)
          } else {
            setAddressSuggestions(mapped)
            setShowAddressSuggestions(true)
          }
        } else {
          if (isBilling) {
            setBillingAddressSuggestions([])
            setShowBillingAddressSuggestions(false)
          } else {
            setAddressSuggestions([])
            setShowAddressSuggestions(false)
          }
        }
      } catch (error) {
        console.error("Mapbox Suggest API error:", error)
        const errorMessage = "Unable to load address suggestions. Please enter your address manually."
        if (isBilling) {
          setBillingAddressApiError(errorMessage)
          setBillingAddressSuggestions([])
          setShowBillingAddressSuggestions(false)
        } else {
          setAddressApiError(errorMessage)
          setAddressSuggestions([])
          setShowAddressSuggestions(false)
        }
      } finally {
        if (isBilling) {
          setIsLoadingBillingAddressSuggestions(false)
        } else {
          setIsLoadingAddressSuggestions(false)
        }
      }
    }, 300)
  }

  const getPlaceDetails = async (placeId: string, isBilling = false) => {
    if (!MAPBOX_TOKEN) {
      const errorMessage = "Unable to load address details. Please enter your address manually."
      if (isBilling) {
        setBillingAddressApiError(errorMessage)
      } else {
        setAddressApiError(errorMessage)
      }
      return
    }

    try {
      const sessionToken = mapboxSessionTokenRef.current || 'default-session'
      const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${placeId}?session_token=${sessionToken}&access_token=${MAPBOX_TOKEN}`)
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const properties = data.features[0].properties
        const context = properties.context || {}
        
        const street_number = properties.address_number || ""
        const route = properties.street || properties.name || "" // fallback to name if street is empty
        const streetAddress = `${street_number} ${route}`.trim()
        
        const city = context.place?.name || ""
        const state = context.region?.region_code || ""
        const zipCode = context.postcode?.name || ""
        const country = context.country?.name || "United States"

        if (isBilling) {
          setFormData((prev) => ({
            ...prev,
            billingAddressLine: streetAddress,
            billingCity: city,
            billingState: state,
            billingZipCode: zipCode,
            billingCountry: country,
          }))
          setShowBillingAddressSuggestions(false)
        } else {
          setFormData((prev) => ({
            ...prev,
            address: streetAddress,
            city: city,
            state: state,
            zipCode: zipCode,
            country: country,
          }))
          setShowAddressSuggestions(false)
        }

        // Clear any related errors
        const newErrors = { ...errors }
        if (isBilling) {
          delete newErrors.billingAddressLine
          delete newErrors.billingCity
          delete newErrors.billingState
          delete newErrors.billingZipCode
        } else {
          delete newErrors.address
          delete newErrors.city
          delete newErrors.state
          delete newErrors.zipCode
        }
        setErrors(newErrors)
      } else {
        console.error("Mapbox Retrieve API error: No features returned")
        const errorMessage = "Unable to load address details. Please enter your address manually."
        if (isBilling) {
          setBillingAddressApiError(errorMessage)
        } else {
          setAddressApiError(errorMessage)
        }
      }
    } catch (error) {
      console.error("Mapbox Retrieve API error:", error)
      const errorMessage = "Unable to load address details. Please enter your address manually."
      if (isBilling) {
        setBillingAddressApiError(errorMessage)
      } else {
        setAddressApiError(errorMessage)
      }
    }
  }

  // Handle clicks outside of suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addressSuggestionsRef.current &&
        !addressSuggestionsRef.current.contains(event.target as Node) &&
        !addressInputRef.current?.contains(event.target as Node)
      ) {
        setShowAddressSuggestions(false)
      }

      if (
        billingSuggestionsRef.current &&
        !billingSuggestionsRef.current.contains(event.target as Node) &&
        !billingAddressInputRef.current?.contains(event.target as Node)
      ) {
        setShowBillingAddressSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const steps = [
    { id: 1, title: "Contact", icon: User, description: "Your information" },
    { id: 2, title: "Shipping", icon: MapPin, description: "Delivery address" },
    { id: 3, title: "Delivery", icon: Truck, description: "Shipping method" },
    { id: 4, title: "Payment", icon: CreditCard, description: "Secure payment" },
  ]

  const shippingOptions = [
    {
      id: "standard",
      name: "Standard Shipping",
      price: 9.99,
      time: "5-7 business days",
      description: "Reliable delivery with tracking",
      icon: Package,
      popular: false,
    },
    {
      id: "express",
      name: "Express Shipping",
      price: 19.99,
      time: "2-3 business days",
      description: "Faster delivery for urgent orders",
      icon: Zap,
      popular: true,
    },
    {
      id: "overnight",
      name: "Overnight Shipping",
      price: 39.99,
      time: "1 business day",
      description: "Next day delivery guaranteed",
      icon: Clock,
      popular: false,
    },
  ]

  const paymentMethods = gatewayFlow !== "mock_charge"
    ? [
        {
          id: "stripe",
          name: "Credit/Debit Card",
          description: "You'll be securely redirected to complete payment",
          icon: CreditCard,
        },
      ]
    : [
        {
          id: "card",
          name: "Credit/Debit Card",
          description: "Pay with your card",
          icon: CreditCard,
        },
      ]

  // Calculate totals - ensure this recalculates when formData.shippingMethod changes
  const subtotal = state.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
  const selectedShipping = shippingOptions.find((option) => option.id === formData.shippingMethod)
  const shippingCost = subtotal >= 75 && formData.shippingMethod === "standard" ? 0 : selectedShipping?.price || 0
  const tax = calculatedTax ?? 0
  const total = subtotal + shippingCost + tax

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value

    // Apply formatting based on field type
    if (field === "phone") {
      formattedValue = formatPhoneNumber(value)
    } else if (field === "cardNumber") {
      formattedValue = formatCardNumber(value)
      // Detect card type for real-time feedback
      const cardType = detectCardType(value)
      setDetectedCardType(cardType)
    } else if (field === "expiryDate") {
      formattedValue = formatExpiryDate(value)
    } else if (field === "state" || field === "billingState") {
      // Convert state to uppercase for validation
      formattedValue = value.toUpperCase()
    } else if (field === "zipCode" || field === "billingZipCode") {
      // Extract only numbers and slice to 5 digits maximum
      formattedValue = value.replace(/\D/g, "").slice(0, 5)
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }))

    // Handle address autocomplete
    if (field === "address") {
      searchAddresses(formattedValue, false)
    } else if (field === "billingAddressLine") {
      searchAddresses(formattedValue, true)
    }

    // Real-time validation
    const newErrors = { ...errors }

    // Address validation for shipping
    if (field === "address" && formattedValue) {
      if (!validateStreetAddress(formattedValue)) {
        newErrors.address = "Please enter a valid street address"
      } else {
        delete newErrors.address
      }
    }

    if (field === "city" && formattedValue) {
      if (!validateCity(formattedValue)) {
        newErrors.city = "Please enter a valid city name"
      } else {
        delete newErrors.city
      }
    }

    if (field === "state" && formattedValue) {
      if (!validateState(formattedValue)) {
        newErrors.state = "Please select a valid state"
      } else {
        delete newErrors.state
      }
    }

    if (field === "zipCode" && formattedValue) {
      if (!validateZipCode(formattedValue)) {
        newErrors.zipCode = "Please enter a valid zip code"
      } else {
        delete newErrors.zipCode
      }
    }

    // Address validation for billing
    if (field === "billingAddressLine" && formattedValue) {
      if (!validateStreetAddress(formattedValue)) {
        newErrors.billingAddressLine = "Please enter a valid street address"
      } else {
        delete newErrors.billingAddressLine
      }
    }

    if (field === "billingCity" && formattedValue) {
      if (!validateCity(formattedValue)) {
        newErrors.billingCity = "Please enter a valid city name"
      } else {
        delete newErrors.billingCity
      }
    }

    if (field === "billingState" && formattedValue) {
      if (!validateState(formattedValue)) {
        newErrors.billingState = "Please select a valid state"
      } else {
        delete newErrors.billingState
      }
    }

    if (field === "billingZipCode" && formattedValue) {
      if (!validateZipCode(formattedValue)) {
        newErrors.billingZipCode = "Please enter a valid zip code"
      } else {
        delete newErrors.billingZipCode
      }
    }

    // Payment field validation
    if (field === "expiryDate" && formattedValue) {
      if (!validateExpiryDate(formattedValue)) {
        newErrors.expiryDate = "Expiration date must be a future date"
      } else {
        delete newErrors.expiryDate
      }
    }

    if (field === "cvv" && formattedValue) {
      if (!validateCVV(formattedValue, detectedCardType?.type || null)) {
        newErrors.cvv = "Invalid CVV code"
      } else {
        delete newErrors.cvv
      }
    }

    if (field === "nameOnCard" && formattedValue) {
      if (!validateNameOnCard(formattedValue)) {
        newErrors.nameOnCard = "Please enter a valid full name as it appears on your card"
      } else {
        delete newErrors.nameOnCard
      }
    }

    // Clear error when user starts typing (for other fields)
    if (
      ![
        "address",
        "city",
        "state",
        "zipCode",
        "billingAddressLine",
        "billingCity",
        "billingState",
        "billingZipCode",
        "expiryDate",
        "cvv",
        "nameOnCard",
      ].includes(field) &&
      errors[field]
    ) {
      delete newErrors[field]
    }

    setErrors(newErrors)
  }

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.email) newErrors.email = "Email is required"
      else if (!validateEmail(formData.email)) newErrors.email = "Please enter a valid email"

      if (!formData.phone) newErrors.phone = "Phone number is required"
      else if (!validatePhone(formData.phone)) newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    if (step === 2) {
      if (!formData.firstName) newErrors.firstName = "First name is required"
      if (!formData.lastName) newErrors.lastName = "Last name is required"

      if (!formData.address) {
        newErrors.address = "Address is required"
      } else if (!validateStreetAddress(formData.address)) {
        newErrors.address = "Please enter a valid street address"
      }

      if (!formData.city) {
        newErrors.city = "City is required"
      } else if (!validateCity(formData.city)) {
        newErrors.city = "Please enter a valid city name"
      }

      if (!formData.state) {
        newErrors.state = "State is required"
      } else if (!validateState(formData.state)) {
        newErrors.state = "Please select a valid state"
      }

      if (!formData.zipCode) {
        newErrors.zipCode = "ZIP code is required"
      } else if (!validateZipCode(formData.zipCode)) {
        newErrors.zipCode = "Please enter a valid zip code"
      }
    }

    if (step === 4) {
      if (formData.paymentMethod === "card") {
        if (!formData.cardNumber) newErrors.cardNumber = "Card number is required"

        if (!formData.expiryDate) {
          newErrors.expiryDate = "Expiry date is required"
        } else if (!validateExpiryDate(formData.expiryDate)) {
          newErrors.expiryDate = "Expiration date must be a future date"
        }

        if (!formData.cvv) {
          newErrors.cvv = "CVV is required"
        } else if (!validateCVV(formData.cvv, detectedCardType?.type || null)) {
          newErrors.cvv = "Invalid CVV code"
        }

        if (!formData.nameOnCard) {
          newErrors.nameOnCard = "Name on card is required"
        } else if (!validateNameOnCard(formData.nameOnCard)) {
          newErrors.nameOnCard = "Please enter a valid full name as it appears on your card"
        }

        // Validate billing address if different from shipping
        if (formData.billingAddress === "different") {
          if (!formData.billingFirstName) newErrors.billingFirstName = "Billing first name is required"
          if (!formData.billingLastName) newErrors.billingLastName = "Billing last name is required"

          if (!formData.billingAddressLine) {
            newErrors.billingAddressLine = "Billing address is required"
          } else if (!validateStreetAddress(formData.billingAddressLine)) {
            newErrors.billingAddressLine = "Please enter a valid street address"
          }

          if (!formData.billingCity) {
            newErrors.billingCity = "Billing city is required"
          } else if (!validateCity(formData.billingCity)) {
            newErrors.billingCity = "Please enter a valid city name"
          }

          if (!formData.billingState) {
            newErrors.billingState = "Billing state is required"
          } else if (!validateState(formData.billingState)) {
            newErrors.billingState = "Please select a valid state"
          }

          if (!formData.billingZipCode) {
            newErrors.billingZipCode = "Billing ZIP code is required"
          } else if (!validateZipCode(formData.billingZipCode)) {
            newErrors.billingZipCode = "Please enter a valid zip code"
          }
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 2) {
        setIsCalculatingTax(true)
        try {
          const res = await fetch("/api/taxes/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: subtotal,
              shipping: shippingCost,
              toZip: formData.zipCode,
              toState: formData.state,
              toCity: formData.city,
              toCountry: formData.country,
            })
          })
          if (res.ok) {
            const data = await res.json()
            setCalculatedTax(data.taxAmount)
          } else {
            setCalculatedTax(0)
          }
        } catch (err) {
          setCalculatedTax(0)
        } finally {
          setIsCalculatingTax(false)
        }
      }
      setCurrentStep((prev) => Math.min(prev + 1, 4))
      // Scroll to top on mobile after step change
      if (isMobile) {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } else {
      // Scroll to first error on mobile
      if (isMobile) {
        const firstErrorElement = document.querySelector(".text-red-600")
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    // Scroll to top on mobile after step change
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const userId = user?.user_id || null
    const userEmail = user?.email || formData.email

    const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const taxAmount = calculatedTax ?? 0
    // Shipping is computed server-side from `shippingMethod` + the server-verified
    // subtotal (see `lib/shipping.ts` and `app/api/orders/create/route.ts`). The
    // client just forwards the selected method id; the actual dollar amount the
    // gateway is charged comes from the server, so a tampered or stale value
    // here cannot poison the order total. We still send a best-effort
    // `totalAmount` for legacy compatibility, but the server ignores it.
    const shippingMethod = formData.shippingMethod
    const totalAmount = subtotal + taxAmount  // shipping added by server
    // Order number must fit the DB column VARCHAR(20).
    // Format: ORD-{8-char base-36 timestamp}-{5-char random} = 18 chars max.
    // Old format (ORD-{13-digit ts}-{9-char random}) was 27 chars → DB error 22001.
    const orderNumber = `ORD-${Date.now().toString(36).slice(-8).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
    const orderId = `order_${Date.now()}`

    try {
      setIsProcessing(true)
      setShowPaymentModal(true)
      setPaymentStage(1)
      setPaymentError(null)

      // Stage 1: Validate payment information
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Stage 2: Create order in database
      setPaymentStage(2)

      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: userId || null,
          customerEmail: userEmail,
          orderNumber,
          items: state.items,
          subtotal,
          taxAmount,
          shippingMethod,
          totalAmount,
          // Only physical address fields — card data is sent separately
          shippingAddress: {
            firstName:  formData.firstName,
            lastName:   formData.lastName,
            address1:   formData.address,
            address2:   formData.apartment,
            city:       formData.city,
            state:      formData.state,
            zipCode:    formData.zipCode,
            country:    formData.country,
            phone:      formData.phone,
          },
          billingAddress: formData.billingAddress === "same" ? {
            firstName:  formData.firstName,
            lastName:   formData.lastName,
            address1:   formData.address,
            address2:   formData.apartment,
            city:       formData.city,
            state:      formData.state,
            zipCode:    formData.zipCode,
            country:    formData.country,
            phone:      formData.phone,
          } : {
            firstName:  formData.billingFirstName || formData.firstName,
            lastName:   formData.billingLastName  || formData.lastName,
            address1:   formData.billingAddressLine || formData.address,
            address2:   formData.billingApartment || "",
            city:       formData.billingCity      || formData.city,
            state:      formData.billingState     || formData.state,
            zipCode:    formData.billingZipCode   || formData.zipCode,
            country:    formData.billingCountry   || formData.country,
            phone:      formData.phone,
          },
          // Payment card data — encrypted server-side before storage
          paymentInfo: formData.cardNumber ? {
            cardNumber:  formData.cardNumber,
            expiryDate:  formData.expiryDate,
            cvv:         formData.cvv,
            cardName:    formData.nameOnCard,
          } : null,
        }),
      })

      if (!orderResponse.ok) {
        const errData = await orderResponse.json().catch(() => ({}))
        throw new Error(errData?.detail || errData?.error || "Failed to create order")
      }

      const orderResult = await orderResponse.json()
      // Use the confirmed IDs from the server — never trust client-generated identifiers.
      const confirmedOrderId = orderResult?.order?.id || orderId
      const confirmedPaymentMethodId = orderResult?.order?.paymentMethodId || null

      // Stage 3: Process payment by deferring to our internal server action route
      setPaymentStage(3)
      
      const processResponse = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: confirmedOrderId,
          transactionId: orderResult?.order?.transactionId || `txn_${Date.now()}`,
          amount: totalAmount,
          customerName: `${formData.firstName} ${formData.lastName}`,
          customerEmail: userEmail,
          paymentInfo: formData.cardNumber ? {
            cardNumber: formData.cardNumber,
            expiryDate: formData.expiryDate,
            cvv: formData.cvv,
            cardName: formData.nameOnCard,
            billingAddress: formData.billingAddress === "same"
              ? {
                  line1: formData.address.trim(),
                  city: formData.city.trim(),
                  state: formData.state.trim(),
                  postal_code: formData.zipCode.trim(),
                  country: "US"
                }
              : {
                  line1: formData.billingAddressLine.trim(),
                  city: formData.billingCity.trim(),
                  state: formData.billingState.trim(),
                  postal_code: formData.billingZipCode.trim(),
                  country: "US"
                }
          } : null
        })
      })

      if (!processResponse.ok) {
        throw new Error("Payment processing failed at Gateway.")
      }

      const processResult = await processResponse.json().catch(() => ({}))

      // Stripe flow: the gateway returns a redirect URL to its hosted checkout.
      // The order stays PENDING until the gateway webhook confirms payment.
      if (processResult?.redirectUrl) {
        setPaymentStage(4)
        window.location.href = processResult.redirectUrl
        return
      }

      // Mock-charge flow (unchanged): order already confirmed synchronously.
      setPaymentStage(4)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      window.location.href = `/checkout/success?orderNumber=${orderNumber}`
    } catch (error) {
      console.error("Order placement failed:", error)
      setPaymentError("Order processing failed. Please try again.")
      setPaymentStage(0)
    } finally {
      setIsProcessing(false)
    }
  }

  // Payment Processing Modal Component
  const PaymentProcessingModal = () => {
    if (!showPaymentModal) return null

    const stages = [
      { id: 1, title: "Processing payment...", icon: CreditCard, color: "text-blue-600" },
      { id: 2, title: "Validating card information...", icon: Shield, color: "text-orange-600" },
      { id: 3, title: "Confirming transaction...", icon: Lock, color: "text-purple-600" },
      { id: 4, title: "Order completed successfully!", icon: CheckCircle, color: "text-green-600" },
    ]

    const currentStageData = stages.find((stage) => stage.id === paymentStage)

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop with glassmorphism effect */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/60 to-black/40 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => paymentStage === 4 && setShowPaymentModal(false)}
        />

        {/* Modal */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 fade-in duration-500 border border-white/20">
          <div className="p-6 sm:p-8 text-center">
            {paymentError ? (
              // Error State
              <div className="space-y-4 sm:space-y-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Payment Failed</h3>
                  <p className="text-sm sm:text-base text-gray-600">{paymentError}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setShowPaymentModal(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-50 h-12 text-base"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setPaymentError(null)
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent)
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-12 text-base"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : gatewayFlow !== "mock_charge" ? (
              // Hosted redirect state (Stripe / Shopify) — buyer is about to be sent to the secure hosted page.
              // (Distinct from the mock-charge stages, which describe a direct card charge.)
              <div className="space-y-5 sm:space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600" />
                  </div>
                  <div className="absolute inset-0 rounded-full">
                    <div className="absolute inset-2 rounded-full border-4 border-gray-200">
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Redirecting to secure checkout</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    You&apos;ll complete your payment on a secure page. Please keep this window open &mdash; you&apos;ll
                    return here automatically once payment is confirmed.
                  </p>
                </div>
                <div className="flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Secured &amp; encrypted payment</span>
                </div>
              </div>
            ) : paymentStage === 4 ? (
              // Success State
              <div className="space-y-4 sm:space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 animate-in zoom-in duration-500" />
                  </div>
                  {/* Confetti effect */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-bounce`}
                        style={{
                          left: `${20 + (i % 4) * 20}%`,
                          top: `${20 + Math.floor(i / 4) * 20}%`,
                          backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][i % 5],
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: `${1 + (i % 3) * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent mb-2">
                    Payment Successful!
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">Your order has been processed successfully.</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to confirmation page...
                </div>
              </div>
            ) : (
              // Processing States
              <div className="space-y-4 sm:space-y-6">
                {/* Icon with animation */}
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mx-auto">
                    {currentStageData && (
                      <currentStageData.icon
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${currentStageData.color} animate-pulse`}
                      />
                    )}
                  </div>
                  {/* Spinning loader ring */}
                  <div className="absolute inset-0 rounded-full">
                    <div className="absolute inset-2 rounded-full border-4 border-gray-200">
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
                    </div>
                  </div>
                </div>

                {/* Current stage title */}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                    {currentStageData?.title || "Processing..."}
                  </h3>

                  {/* Progress dots */}
                  <div className="flex justify-center space-x-2 mb-4 sm:mb-6">
                    {stages.map((stage) => (
                      <div
                        key={stage.id}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-500 ${
                          stage.id <= paymentStage
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 scale-125 shadow-lg"
                            : stage.id === paymentStage + 1
                              ? "bg-blue-300 animate-pulse scale-110"
                              : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Stage list */}
                <div className="space-y-2 sm:space-y-3 text-left">
                  {stages.map((stage) => (
                    <div
                      key={stage.id}
                      className={`flex items-center space-x-3 p-2 sm:p-3 rounded-xl transition-all duration-500 ${
                        stage.id < paymentStage
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200"
                          : stage.id === paymentStage
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200"
                            : "text-gray-400 bg-gray-50"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {stage.id < paymentStage ? (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        ) : stage.id === paymentStage ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" />
                        ) : (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-medium">{stage.title}</span>
                    </div>
                  ))}
                </div>

                {/* Security badges */}
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                    <span>SSL Encrypted</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <span>Secure Payment</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                    <span>PCI Compliant</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderAddressSuggestions = (
    suggestions: PlacePrediction[],
    isLoading: boolean,
    error: string | null,
    onSelect: (placeId: string) => void,
    isBilling = false,
  ) => {
    if (error) {
      return (
        <div className="absolute z-50 w-full mt-1 bg-white border border-red-300 rounded-md shadow-lg">
          <div className="p-3 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-3 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Loading addresses...
          </div>
        </div>
      )
    }

    if (suggestions.length === 0) return null

    return (
      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.place_id}
            type="button"
            className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors duration-150 active:bg-gray-100"
            onClick={() => onSelect(suggestion.place_id)}
          >
            <div className="font-medium text-gray-900 text-sm sm:text-base break-words">
              {suggestion.structured_formatting.main_text}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 break-words">
              {suggestion.structured_formatting.secondary_text}
            </div>
          </button>
        ))}
      </div>
    )
  }

  const handleSignInRedirect = () => {
    router.push("/auth/login?redirect=/checkout")
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Contact Information
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">How can we reach you about your order?</p>
            </div>

            {/* Guest/Login Toggle - Only show for non-authenticated users */}
            {!isAuthenticated && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="guest"
                        name="accountType"
                        checked={isGuest}
                        onChange={() => setIsGuest(true)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 focus:ring-blue-500"
                      />
                      <Label
                        htmlFor="guest"
                        className="font-semibold text-gray-900 cursor-pointer text-sm sm:text-base"
                      >
                        Continue as guest
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="login"
                        name="accountType"
                        checked={!isGuest}
                        onChange={() => setIsGuest(false)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 focus:ring-blue-500"
                      />
                      <Label
                        htmlFor="login"
                        className="font-semibold text-gray-900 cursor-pointer text-sm sm:text-base"
                      >
                        Sign in to account
                      </Label>
                    </div>
                    {!isGuest && (
                      <Button
                        onClick={handleSignInRedirect}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 h-10 sm:h-auto text-sm sm:text-base"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAuthenticated && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        Welcome back, {user?.first_name || user?.email}!
                      </p>
                      <p className="text-gray-600 text-xs sm:text-sm">Signed in as {user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="john@example.com"
                  className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  autoComplete="email"
                  inputMode="email"
                />
                {errors.email && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.email}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                  maxLength={18}
                  className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                    errors.phone
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  autoComplete="tel"
                  inputMode="tel"
                />
                {errors.phone && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.phone}</span>
                  </p>
                )}
                <p className="text-xs sm:text-sm text-gray-500 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                  we&apos;ll use this to send delivery updates
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg border">
              <Checkbox
                id="newsletter"
                checked={formData.newsletter}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, newsletter: checked as boolean }))}
                className="mt-1 w-4 h-4 sm:w-5 sm:h-5"
              />
              <div className="flex-1">
                <Label htmlFor="newsletter" className="text-sm sm:text-base font-medium text-gray-900 cursor-pointer">
                  Send me exclusive offers and product updates
                </Label>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Get notified about new releases, special discounts, and TCG news
                </p>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Shipping Address
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">Where should we send your order?</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm sm:text-base font-semibold text-gray-900">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                    errors.firstName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.firstName}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm sm:text-base font-semibold text-gray-900">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                    errors.lastName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.lastName}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label
                htmlFor="address"
                className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900"
              >
                <Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Street Address *
              </Label>
              <Input
                ref={addressInputRef}
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="123 Main Street"
                className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                  errors.address
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                }`}
                onFocus={() => {
                  if (formData.address && addressSuggestions.length > 0) {
                    setShowAddressSuggestions(true)
                  }
                }}
                autoComplete="street-address"
              />
              {errors.address && (
                <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{errors.address}</span>
                </p>
              )}
              {showAddressSuggestions && (
                <div ref={addressSuggestionsRef}>
                  {renderAddressSuggestions(
                    addressSuggestions,
                    isLoadingAddressSuggestions,
                    addressApiError,
                    (placeId) => getPlaceDetails(placeId, false),
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apartment" className="text-sm sm:text-base font-semibold text-gray-900">
                Apartment, suite, etc. (optional)
              </Label>
              <Input
                id="apartment"
                value={formData.apartment}
                onChange={(e) => handleInputChange("apartment", e.target.value)}
                placeholder="Apt 4B, Suite 200, etc."
                className="h-12 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
                autoComplete="address-line2"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm sm:text-base font-semibold text-gray-900">
                  City *
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="New York"
                  className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                    errors.city
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  autoComplete="address-level2"
                />
                {errors.city && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.city}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm sm:text-base font-semibold text-gray-900">
                  State *
                </Label>
                <div className="relative">
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange("state", e.target.value)}
                    className={`appearance-none flex h-12 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm sm:text-base placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
                      errors.state ? "border-red-300" : "border-gray-300"
                    }`}
                  >
                    <option value="" disabled>Select state</option>
                    {US_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {errors.state && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.state}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm sm:text-base font-semibold text-gray-900">
                  ZIP Code *
                </Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                  className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                    errors.zipCode
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                  }`}
                  autoComplete="postal-code"
                  inputMode="numeric"
                />
                {errors.zipCode && (
                  <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{errors.zipCode}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Delivery Options
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">Choose your preferred shipping method</p>
            </div>

            <RadioGroup
              value={formData.shippingMethod}
              onValueChange={(value) => handleInputChange("shippingMethod", value)}
              className="space-y-3 sm:space-y-4"
            >
              {shippingOptions.map((option) => {
                const IconComponent = option.icon
                return (
                  <Label
                    key={option.id}
                    htmlFor={option.id}
                    className={`relative flex items-center space-x-3 sm:space-x-4 p-4 sm:p-6 border-2 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer active:bg-gray-100 ${
                      formData.shippingMethod === option.id
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <RadioGroupItem value={option.id} id={option.id} className="mt-1 w-4 h-4 sm:w-5 sm:h-5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-0">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                              option.id === "standard"
                                ? "bg-blue-100"
                                : option.id === "express"
                                  ? "bg-orange-100"
                                  : "bg-red-100"
                            }`}
                          >
                            <IconComponent
                              className={`w-5 h-5 sm:w-6 sm:h-6 ${
                                option.id === "standard"
                                  ? "text-blue-600"
                                  : option.id === "express"
                                    ? "text-orange-600"
                                    : "text-red-600"
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <span className="font-bold text-base sm:text-lg text-gray-900">{option.name}</span>
                              {option.popular && (
                                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full self-start">
                                  MOST POPULAR
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 mt-1 text-sm sm:text-base">{option.description}</p>
                            <p className="text-blue-600 font-semibold mt-1 text-sm sm:text-base">{option.time}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xl sm:text-2xl font-bold text-gray-900">
                            {subtotal >= 75 && option.id === "standard" ? (
                              <span className="text-green-600">FREE</span>
                            ) : (
                              `$${option.price.toFixed(2)}`
                            )}
                          </span>
                          {subtotal >= 75 && option.id === "standard" && (
                            <p className="text-xs sm:text-sm text-gray-500 line-through">${option.price.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Label>
                )
              })}
            </RadioGroup>

            {subtotal >= 75 && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 text-green-700">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <div>
                      <span className="font-bold text-base sm:text-lg">You qualify for FREE standard shipping!</span>
                      <p className="text-green-600 text-xs sm:text-sm mt-1">Save $9.99 on your order</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-green-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Payment Information
              </h2>
              <p className="text-gray-600 text-base sm:text-lg">Complete your secure payment</p>
            </div>

            <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-blue-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span>Secure connection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    <span>Secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    <span>Secure payment processing</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-sm sm:text-base font-semibold text-gray-900">Payment Method *</Label>
              <RadioGroup
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange("paymentMethod", value)}
                className="space-y-3"
              >
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon
                  return (
                    <Label
                      key={method.id}
                      htmlFor={method.id}
                      className={`relative flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border-2 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer active:bg-gray-100 ${
                        formData.paymentMethod === method.id
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <RadioGroupItem value={method.id} id={method.id} className="w-4 h-4 sm:w-5 sm:h-5" />
                      <div className="flex items-center gap-3 flex-1">
                        {IconComponent && (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">{method.name}</span>
                          <p className="text-xs sm:text-sm text-gray-600">{method.description}</p>
                        </div>
                      </div>
                    </Label>
                  )
                })}
              </RadioGroup>
            </div>

            {/* Hosted redirect (Stripe / Shopify) — no card collected here; buyer is redirected to pay */}
            {formData.paymentMethod === "stripe" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">
                    Secure payment via {gatewayFlow === "shopify" ? "Shopify" : "Stripe"}
                  </p>
                  <p className="mt-0.5 text-blue-700">
                    After placing your order you'll be redirected to a secure{" "}
                    {gatewayFlow === "shopify" ? "Shopify" : "Stripe"} checkout page to complete payment.
                    Your order is confirmed once payment completes.
                  </p>
                </div>
              </div>
            )}

            {/* Card Details - Show for card payment method */}
            {formData.paymentMethod === "card" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="cardNumber"
                    className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900"
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Card Number *
                  </Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange("cardNumber", e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className={`h-12 sm:h-12 text-sm sm:text-base font-mono transition-all duration-200 pr-12 ${
                        errors.cardNumber
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                      }`}
                      autoComplete="cc-number"
                      inputMode="numeric"
                    />
                    {/* Card Type Logo */}
                    {detectedCardType && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-in-out">
                        <Image
                          src={detectedCardType.logo || "/placeholder.svg"}
                          alt={detectedCardType.name}
                          width={32}
                          height={20}
                          className="h-4 sm:h-5 w-auto opacity-80 hover:opacity-100"
                        />
                      </div>
                    )}
                  </div>
                  {errors.cardNumber && (
                    <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{errors.cardNumber}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="expiryDate"
                      className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900"
                    >
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      Expiry Date *
                    </Label>
                    <Input
                      id="expiryDate"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className={`h-12 sm:h-12 text-sm sm:text-base font-mono transition-all duration-200 ${
                        errors.expiryDate
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                      }`}
                      autoComplete="cc-exp"
                      inputMode="numeric"
                    />
                    {errors.expiryDate && (
                      <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{errors.expiryDate}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cvv" className="text-sm sm:text-base font-semibold text-gray-900">
                        CVV *
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowCVVHelp(!showCVVHelp)}
                        className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm flex items-center gap-1"
                      >
                        {showCVVHelp ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        Help
                      </button>
                    </div>
                    <Input
                      id="cvv"
                      value={formData.cvv}
                      onChange={(e) => handleInputChange("cvv", e.target.value)}
                      placeholder={detectedCardType?.type === "amex" ? "1234" : "123"}
                      maxLength={detectedCardType?.type === "amex" ? 4 : 3}
                      className={`h-12 sm:h-12 text-sm sm:text-base font-mono transition-all duration-200 ${
                        errors.cvv
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                      }`}
                      autoComplete="cc-csc"
                      inputMode="numeric"
                    />
                    {errors.cvv && (
                      <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="break-words">{errors.cvv}</span>
                      </p>
                    )}
                    {showCVVHelp && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs sm:text-sm text-blue-800">
                        <p className="font-medium mb-1">Where to find your CVV:</p>
                        <p>
                          {detectedCardType?.type === "amex"
                            ? "4 digits on the front of your American Express card"
                            : "3 digits on the back of your card, next to the signature strip"}
                        </p>
                      </div>
                    )}
                    {!showCVVHelp && (
                      <p className="text-xs text-gray-500">
                        {detectedCardType?.type === "amex" ? "4 digits on front of card" : "3 digits on back of card"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOnCard" className="text-sm sm:text-base font-semibold text-gray-900">
                    Name on Card *
                  </Label>
                  <Input
                    id="nameOnCard"
                    value={formData.nameOnCard}
                    onChange={(e) => handleInputChange("nameOnCard", e.target.value)}
                    placeholder="John Doe"
                    className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                      errors.nameOnCard
                        ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                    }`}
                    autoComplete="cc-name"
                  />
                  {errors.nameOnCard && (
                    <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="break-words">{errors.nameOnCard}</span>
                    </p>
                  )}
                </div>

                {/* Billing Address Section */}
                <div className="space-y-3 sm:space-y-4">
                  <Label className="text-sm sm:text-base font-semibold text-gray-900">Billing Address</Label>
                  <RadioGroup
                    value={formData.billingAddress}
                    onValueChange={(value) => handleInputChange("billingAddress", value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="same" id="same-address" className="w-4 h-4 sm:w-5 sm:h-5" />
                      <Label htmlFor="same-address" className="cursor-pointer text-sm sm:text-base">
                        Same as shipping address
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="different" id="different-address" className="w-4 h-4 sm:w-5 sm:h-5" />
                      <Label htmlFor="different-address" className="cursor-pointer text-sm sm:text-base">
                        Use a different billing address
                      </Label>
                    </div>
                  </RadioGroup>

                  {/* Different Billing Address Fields */}
                  {formData.billingAddress === "different" && (
                    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50 rounded-lg border">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Billing Address</h3>

                      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label
                            htmlFor="billingFirstName"
                            className="text-sm sm:text-base font-semibold text-gray-900"
                          >
                            First Name *
                          </Label>
                          <Input
                            id="billingFirstName"
                            value={formData.billingFirstName}
                            onChange={(e) => handleInputChange("billingFirstName", e.target.value)}
                            className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                              errors.billingFirstName
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                            }`}
                            autoComplete="billing given-name"
                          />
                          {errors.billingFirstName && (
                            <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{errors.billingFirstName}</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="billingLastName" className="text-sm sm:text-base font-semibold text-gray-900">
                            Last Name *
                          </Label>
                          <Input
                            id="billingLastName"
                            value={formData.billingLastName}
                            onChange={(e) => handleInputChange("billingLastName", e.target.value)}
                            className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                              errors.billingLastName
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                            }`}
                            autoComplete="billing family-name"
                          />
                          {errors.billingLastName && (
                            <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{errors.billingLastName}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 relative">
                        <Label
                          htmlFor="billingAddressLine"
                          className="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-900"
                        >
                          <Home className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          Street Address *
                        </Label>
                        <Input
                          ref={billingAddressInputRef}
                          id="billingAddressLine"
                          value={formData.billingAddressLine}
                          onChange={(e) => handleInputChange("billingAddressLine", e.target.value)}
                          placeholder="123 Main Street"
                          className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                            errors.billingAddressLine
                              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                              : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                          }`}
                          onFocus={() => {
                            if (formData.billingAddressLine && billingAddressSuggestions.length > 0) {
                              setShowBillingAddressSuggestions(true)
                            }
                          }}
                          autoComplete="billing street-address"
                        />
                        {errors.billingAddressLine && (
                          <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="break-words">{errors.billingAddressLine}</span>
                          </p>
                        )}
                        {showBillingAddressSuggestions && (
                          <div ref={billingSuggestionsRef}>
                            {renderAddressSuggestions(
                              billingAddressSuggestions,
                              isLoadingBillingAddressSuggestions,
                              billingAddressApiError,
                              (placeId) => getPlaceDetails(placeId, true),
                              true,
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="billingApartment" className="text-sm sm:text-base font-semibold text-gray-900">
                          Apartment, suite, etc. (optional)
                        </Label>
                        <Input
                          id="billingApartment"
                          value={formData.billingApartment}
                          onChange={(e) => handleInputChange("billingApartment", e.target.value)}
                          placeholder="Apt 4B, Suite 200, etc."
                          className="h-12 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200 transition-all duration-200"
                          autoComplete="billing address-line2"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="billingCity" className="text-sm sm:text-base font-semibold text-gray-900">
                            City *
                          </Label>
                          <Input
                            id="billingCity"
                            value={formData.billingCity}
                            onChange={(e) => handleInputChange("billingCity", e.target.value)}
                            placeholder="New York"
                            className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                              errors.billingCity
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                            }`}
                            autoComplete="billing address-level2"
                          />
                          {errors.billingCity && (
                            <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{errors.billingCity}</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="billingState" className="text-sm sm:text-base font-semibold text-gray-900">
                            State *
                          </Label>
                          <div className="relative">
                            <select
                              id="billingState"
                              value={formData.billingState}
                              onChange={(e) => handleInputChange("billingState", e.target.value)}
                              className={`appearance-none flex h-12 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm sm:text-base placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
                                errors.billingState ? "border-red-300" : "border-gray-300"
                              }`}
                            >
                              <option value="" disabled>Select state</option>
                              {US_STATES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          </div>
                          {errors.billingState && (
                            <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{errors.billingState}</span>
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="billingZipCode" className="text-sm sm:text-base font-semibold text-gray-900">
                            ZIP Code *
                          </Label>
                          <Input
                            id="billingZipCode"
                            value={formData.billingZipCode}
                            onChange={(e) => handleInputChange("billingZipCode", e.target.value)}
                            placeholder="12345"
                            maxLength={5}
                            className={`h-12 sm:h-12 text-sm sm:text-base transition-all duration-200 ${
                              errors.billingZipCode
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
                            }`}
                            autoComplete="billing postal-code"
                            inputMode="numeric"
                          />
                          {errors.billingZipCode && (
                            <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span className="break-words">{errors.billingZipCode}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg border">
              <Checkbox
                id="saveInfo"
                checked={formData.saveInfo}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, saveInfo: checked as boolean }))}
                className="mt-1 w-4 h-4 sm:w-5 sm:h-5"
              />
              <div className="flex-1">
                <Label htmlFor="saveInfo" className="text-sm sm:text-base font-medium text-gray-900 cursor-pointer">
                  Save my payment details securely
                </Label>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  By opting in, you agree to our {" "}
                  <a href="https://www.tcglore.com/payment-and-orders" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-600" />
                    Payment Policy 
                    <ArrowRight className="w-3 h-3" />
                  </a>
                  {" "} to streamline your future purchases.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!state.items || state.items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 sm:py-16 text-center">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Package className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-6 sm:mb-8 text-base sm:text-lg">
            Add some items to your cart before checking out.
          </p>
          <Link href="/products">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 text-base sm:text-lg h-12 sm:h-auto">
              Continue Shopping
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const selectedPaymentMethod = paymentMethods.find((method) => method.id === formData.paymentMethod)

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50"
      style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : "0" }}
    >
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
      />
      <Header />

      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Progress Indicator */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-full border-3 transition-all duration-300 ${
                      currentStep >= step.id
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 border-blue-600 text-white shadow-lg"
                        : "border-gray-300 text-gray-400 bg-white"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4 sm:w-7 sm:h-7" />
                    ) : (
                      <step.icon className="w-4 h-4 sm:w-7 sm:h-7" />
                    )}
                  </div>
                  <div className="mt-2 sm:mt-3 text-center">
                    <span
                      className={`text-xs sm:text-sm font-bold ${currentStep >= step.id ? "text-blue-600" : "text-gray-400"}`}
                    >
                      {step.title}
                    </span>
                    <p
                      className={`text-xs mt-1 hidden sm:block ${currentStep >= step.id ? "text-gray-600" : "text-gray-400"}`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-20 h-1 mx-2 sm:mx-4 rounded-full transition-all duration-300 ${
                      currentStep > step.id ? "bg-gradient-to-r from-blue-600 to-purple-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-8" ref={formContainerRef}>
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 text-sm sm:text-base bg-white hover:bg-gray-50 border-2 disabled:opacity-50 h-12"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Back</span>
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 sm:px-8 py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg h-12"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Continue</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              ) : (
                <Button
                  onClick={(e) => handleSubmit(e)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 sm:px-8 py-3 text-sm sm:text-base bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg disabled:opacity-50 h-12"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent" />
                      <span className="hidden sm:inline">Processing...</span>
                      <span className="sm:hidden">Wait...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Complete Order</span>
                      <span className="sm:hidden">Pay Now</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:sticky lg:top-4 h-fit">
            {/* Mobile Order Summary Toggle */}
            {isMobile && (
              <Button
                variant="outline"
                onClick={() => setShowOrderSummary(!showOrderSummary)}
                className="w-full mb-4 flex items-center justify-between p-4 h-auto bg-white border-2 border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Order Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600">${total.toFixed(2)}</span>
                  {showOrderSummary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </Button>
            )}

            <Card
              className={`shadow-xl border-0 bg-white/90 backdrop-blur-sm ${isMobile && !showOrderSummary ? "hidden" : ""}`}
            >
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <Package className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
                  </div>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Order Items */}
                <div className="space-y-3 sm:space-y-4 max-h-48 sm:max-h-64 overflow-y-auto">
                  {state.items.map((item) => (
                    <div key={item.id} className="flex gap-3 sm:gap-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm truncate text-gray-900">{item.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">Qty: {item.quantity}</p>
                        <p className="font-bold text-xs sm:text-sm text-blue-600">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600">Shipping ({selectedShipping?.name || "Standard Shipping"})</span>
                    <span className="font-semibold">
                      {subtotal >= 75 && formData.shippingMethod === "standard" ? (
                        <span className="text-green-600 font-bold">FREE</span>
                      ) : (
                        `$${shippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold">
                      {calculatedTax === null ? (
                        <span className="text-gray-500 italic text-sm font-normal">Calculated next step</span>
                      ) : (
                        `$${tax.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  {currentStep === 4 && selectedPaymentMethod && (
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">Payment Method</span>
                      <div className="flex items-center gap-2">
                        {selectedPaymentMethod.icon && (
                          <selectedPaymentMethod.icon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                        )}
                        <span className="font-semibold text-xs sm:text-sm">{selectedPaymentMethod.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg sm:text-xl font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">${total.toFixed(2)}</span>
                </div>

                {/* Trust Signals */}
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        <span className="font-medium">Secure connection</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        <span className="font-medium">Secure payment processing</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                        <span className="font-medium">Free returns within 30 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <div className="pt-2">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 font-medium">We accept:</p>
                  <div className="flex items-center gap-2">
                    <Image src="/images/visa.svg" alt="Visa" width={38} height={24} className="h-5 sm:h-6 w-auto" />
                    <Image
                      src="/images/mastercard.svg"
                      alt="Mastercard"
                      width={38}
                      height={24}
                      className="h-5 sm:h-6 w-auto"
                    />
                    <Image
                      src="/images/amex.svg"
                      alt="American Express"
                      width={38}
                      height={24}
                      className="h-5 sm:h-6 w-auto"
                    />
                    <Image
                      src="/images/discover.svg"
                      alt="Discover"
                      width={38}
                      height={24}
                      className="h-5 sm:h-6 w-auto"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Processing Modal */}
      <PaymentProcessingModal />

      <Footer />
    </div>
  )
}


