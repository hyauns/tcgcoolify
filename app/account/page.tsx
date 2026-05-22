"use client"

import useSWR, { mutate } from "swr"
import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User, Package, MapPin, Settings, Edit, Plus, Mail,
  AlertCircle, CheckCircle, Clock, Truck, Trash2, Star,
} from "lucide-react"
import Link from "next/link"
import { Header } from "../components/header"
import { Footer } from "../components/footer"
import { DemoAccountBanner } from "../components/demo-account-banner"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

interface Order {
  id: string
  order_number: string
  status: string
  payment_status: string
  subtotal: number
  tax_amount: number
  shipping_amount: number
  total_amount: number
  shipping_address: any
  tracking_number: string | null
  order_date: string
  created_at: string
  items: OrderItem[]
}

interface Address {
  id: string
  first_name: string
  last_name: string
  company: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  phone: string | null
  is_default: boolean
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("fetch failed")
    return r.json()
  })

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading, logout, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null)
  const [isDeletingAddress, setIsDeletingAddress] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
  })
  const [orderFilter, setOrderFilter] = useState<string>("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)

  const activeTab = searchParams?.get("tab") || "overview"

  // ─── SWR data fetching (only runs when authenticated) ──────────────────────
  const shouldFetch = isAuthenticated && !!user

  const { data: ordersData, isLoading: ordersLoading } = useSWR<{ orders: Order[] }>(
    shouldFetch ? "/api/account/orders" : null,
    fetcher,
  )

  const { data: addressesData, isLoading: addressesLoading, mutate: mutateAddresses } = useSWR<{ addresses: Address[] }>(
    shouldFetch ? "/api/account/addresses" : null,
    fetcher,
  )

  const userOrders: Order[] = ordersData?.orders ?? []
  const userAddresses: Address[] = addressesData?.addresses ?? []

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href)
    if (value === "overview") {
      url.searchParams.delete("tab")
    } else {
      url.searchParams.set("tab", value)
    }
    router.push(url.pathname + url.search)
  }

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return
    setIsDeletingAddress(true)
    try {
      const res = await fetch(`/api/account/addresses/${addressToDelete}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Delete failed")
      await mutateAddresses()
      toast({ title: "Address Deleted", description: "The address has been removed from your account." })
    } catch (err) {
      console.error("Delete address failed:", err)
      toast({ title: "Error", description: "Failed to delete address. Please try again.", variant: "destructive" })
    } finally {
      setIsDeletingAddress(false)
      setDeleteDialogOpen(false)
      setAddressToDelete(null)
    }
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        }),
      })
      if (!res.ok) throw new Error("Update failed")
      toast({ title: "Profile Updated", description: "Your profile information has been saved." })
      setIsEditing(false)
    } catch (err) {
      console.error("Profile save failed:", err)
      toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":   return <CheckCircle className="h-4 w-4 text-green-600" />
      case "shipped":     return <Truck className="h-4 w-4 text-blue-600" />
      case "processing":  return <Clock className="h-4 w-4 text-yellow-600" />
      default:            return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":   return "bg-green-100 text-green-800"
      case "shipped":     return "bg-blue-100 text-blue-800"
      case "processing":  return "bg-yellow-100 text-yellow-800"
      default:            return "bg-gray-100 text-gray-800"
    }
  }

  const getFilteredOrders = () => {
    if (orderFilter === "all") return userOrders
    return userOrders.filter((o) => o.status?.toLowerCase() === orderFilter)
  }

  // ─── Auth guards ───────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading your account...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access your account</h1>
          <Link href="/auth/login"><Button>Sign In</Button></Link>
        </div>
        <Footer />
      </div>
    )
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DemoAccountBanner />

      {/* Confirm-delete dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Address</h3>
            <p className="text-gray-600 text-sm mb-4">Are you sure you want to delete this address? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingAddress}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteAddress} disabled={isDeletingAddress}>
                {isDeletingAddress ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Account</h1>
              <p className="text-gray-600 mt-1">Manage your account settings and view your orders</p>
            </div>
            <Button variant="outline" onClick={logout}>Sign Out</Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="addresses" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Addresses</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* ── OVERVIEW ── */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Profile Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    {user.total_orders > 0 && (
                      <div className="pt-2 border-t flex gap-4 text-sm">
                        <span className="text-gray-600">{user.total_orders} order{user.total_orders !== 1 ? "s" : ""}</span>
                        <span className="text-gray-600">${Number(user.total_spent).toFixed(2)} spent</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />Recent Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="space-y-3">
                        <SkeletonLine className="w-3/4" />
                        <SkeletonLine className="w-1/2" />
                        <SkeletonLine className="w-2/3" />
                      </div>
                    ) : userOrders.length > 0 ? (
                      <div className="space-y-2">
                        {userOrders.slice(0, 3).map((order) => (
                          <div key={order.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{order.order_number}</p>
                              <p className="text-xs text-gray-600">${order.total_amount.toFixed(2)}</p>
                            </div>
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent" onClick={() => handleTabChange("orders")}>
                          View All Orders
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">No orders yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Addresses Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />Addresses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {addressesLoading ? (
                      <div className="space-y-2">
                        <SkeletonLine className="w-1/2" />
                        <SkeletonLine className="w-3/4" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm">
                          {userAddresses.length} saved address{userAddresses.length !== 1 ? "es" : ""}
                        </p>
                        {userAddresses.slice(0, 1).map((addr) => (
                          <p key={addr.id} className="text-xs text-gray-500 truncate">
                            {addr.address_line1}, {addr.city}
                          </p>
                        ))}
                        <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent" onClick={() => handleTabChange("addresses")}>
                          Manage Addresses
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── ORDERS ── */}
            <TabsContent value="orders" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Order History</h2>
                {!ordersLoading && (
                  <p className="text-gray-600">{userOrders.length} total order{userOrders.length !== 1 ? "s" : ""}</p>
                )}
              </div>

              {/* Status filter */}
              {!ordersLoading && userOrders.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {["all", "pending", "processing", "shipped", "delivered"].map((f) => (
                    <Button
                      key={f}
                      variant={orderFilter === f ? "default" : "outline"}
                      size="sm"
                      onClick={() => setOrderFilter(f)}
                      className="capitalize"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              )}

              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6 space-y-3">
                        <SkeletonLine className="w-1/3" />
                        <SkeletonLine className="w-1/2" />
                        <SkeletonLine className="w-1/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : getFilteredOrders().length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {userOrders.length === 0 ? "No orders yet" : "No orders match this filter"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {userOrders.length === 0
                        ? "Start shopping to see your orders here"
                        : "Try a different filter to see your orders"}
                    </p>
                    {userOrders.length === 0 && (
                      <Link href="/products"><Button>Browse Products</Button></Link>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {getFilteredOrders().map((order) => (
                    <Card key={order.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(order.status)}
                            <div>
                              <p className="font-semibold">{order.order_number}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.order_date || order.created_at).toLocaleDateString("en-AU", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            <span className="font-semibold">${order.total_amount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Items */}
                        {order.items.length > 0 && (
                          <div className="border-t pt-3 space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between text-sm text-gray-600">
                                <span>{item.product_name} × {item.quantity}</span>
                                <span>${item.total_price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tracking */}
                        {order.tracking_number && (
                          <p className="text-xs text-blue-600 mt-3">
                            Tracking: {order.tracking_number}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── ADDRESSES ── */}
            <TabsContent value="addresses" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Saved Addresses</h2>
                <Link href="/account/addresses/new">
                  <Button><Plus className="h-4 w-4 mr-2" />Add Address</Button>
                </Link>
              </div>

              {addressesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6 space-y-3">
                        <SkeletonLine className="w-1/2" />
                        <SkeletonLine className="w-3/4" />
                        <SkeletonLine className="w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : userAddresses.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No addresses saved</h3>
                    <p className="text-gray-600 mb-4">Add your first address to make checkout faster</p>
                    <Link href="/account/addresses/new">
                      <Button><Plus className="h-4 w-4 mr-2" />Add Address</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userAddresses.map((addr) => (
                    <Card key={addr.id} className={addr.is_default ? "ring-2 ring-blue-500" : ""}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{addr.first_name} {addr.last_name}</p>
                            {addr.is_default && (
                              <Badge className="text-xs bg-blue-100 text-blue-800">Default</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-red-600"
                            onClick={() => handleDeleteAddress(String(addr.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600 space-y-0.5">
                          {addr.company && <p>{addr.company}</p>}
                          <p>{addr.address_line1}</p>
                          {addr.address_line2 && <p>{addr.address_line2}</p>}
                          <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                          <p>{addr.country}</p>
                          {addr.phone && <p>{addr.phone}</p>}
                        </div>
                        <Link href={`/account/addresses/edit/${addr.id}`} className="mt-3 inline-block">
                          <Button variant="outline" size="sm" className="bg-transparent">
                            <Edit className="h-3 w-3 mr-1" />Edit
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── SETTINGS ── */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal information and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={profileData.email} disabled className="bg-gray-50" />
                        <p className="text-xs text-gray-500">Email address cannot be changed here.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                          {isSavingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSavingProfile}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">First Name</Label>
                          <p className="mt-1">{user.first_name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Last Name</Label>
                          <p className="mt-1">{user.last_name}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Email</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <p>{user.email}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setProfileData({ firstName: user.first_name, lastName: user.last_name, email: user.email })
                          setIsEditing(true)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />Edit Profile
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Security</CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link href="/auth/forgot-password">
                    <Button variant="outline">Change Password</Button>
                  </Link>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  )
}

