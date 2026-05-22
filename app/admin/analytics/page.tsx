"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Download, BarChart3, Target } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { format, subDays } from "date-fns"
// AnalyticsPDFExporter (which pulls in jspdf + html2canvas, ~150KB combined)
// is dynamically imported inside the export handler so it stays out of the
// admin/analytics initial bundle. Only the type is imported eagerly.
import type { AnalyticsReportData } from "@/lib/pdf-export"
import { useToast } from "@/hooks/use-toast"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

type RevenueData = {
  date: string
  revenue: number
  orders: number
  averageOrderValue: number
}

type TopSellingProduct = {
  id: number
  name: string
  category: string
  totalSold: number
  revenue: number
  unitsSold: number
}

type CustomerAcquisition = {
  date: string
  newCustomers: number
  totalCustomers: number
}

type AverageOrderValueTrend = {
  date: string
  averageOrderValue: number
  orderCount: number
}

type ConversionFunnelData = {
  step: string
  count: number
  conversionRate: number
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [timeframe, setTimeframe] = useState("30d")
  const [loading, setLoading] = useState(true)
  const [exportingPDF, setExportingPDF] = useState(false)
  const { toast } = useToast()

  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([])
  const [customerAcquisition, setCustomerAcquisition] = useState<CustomerAcquisition[]>([])
  const [aovTrends, setAovTrends] = useState<AverageOrderValueTrend[]>([])
  const [funnelData, setFunnelData] = useState<ConversionFunnelData[]>([])
  const [summary, setSummary] = useState({
    ordersLast30Days: 0,
    revenueLast30Days: 0,
    newCustomersLast30Days: 0,
    avgOrderValueLast30Days: 0,
  })

  useEffect(() => {
    loadAnalyticsData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, timeframe])

  const loadAnalyticsData = async () => {
    if (!dateRange?.from || !dateRange?.to) return

    setLoading(true)
    try {
      const startDate = format(dateRange.from, "yyyy-MM-dd")
      const endDate = format(dateRange.to, "yyyy-MM-dd")

      console.log("[v0] Loading analytics data from API...")

      const response = await fetch(`/api/admin/analytics?startDate=${startDate}&endDate=${endDate}`)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Analytics data received:", JSON.stringify(data).substring(0, 200) + "...")

      setRevenueData(data.revenueData || [])
      setTopProducts(data.topProducts || [])
      setCustomerAcquisition(data.customerAcquisition || [])
      setAovTrends(data.aovTrends || [])
      setFunnelData(data.funnelData || [])
      setSummary(
        data.summary || {
          ordersLast30Days: 0,
          revenueLast30Days: 0,
          newCustomersLast30Days: 0,
          avgOrderValueLast30Days: 0,
        },
      )

      console.log("[v0] Top products data:", data.topProducts)
    } catch (error) {
      console.error("Error loading analytics data:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
    const now = new Date()
    let from: Date

    switch (value) {
      case "7d":
        from = subDays(now, 7)
        break
      case "30d":
        from = subDays(now, 30)
        break
      case "90d":
        from = subDays(now, 90)
        break
      case "1y":
        from = subDays(now, 365)
        break
      default:
        from = subDays(now, 30)
    }

    setDateRange({ from, to: now })
  }

  const exportToPDF = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select a valid date range",
        variant: "destructive",
      })
      return
    }

    setExportingPDF(true)
    try {
      const reportData: AnalyticsReportData = {
        summary,
        revenueData,
        topProducts,
        customerAcquisition,
        aovTrends,
        funnelData,
        dateRange: {
          from: format(dateRange.from, "yyyy-MM-dd"),
          to: format(dateRange.to, "yyyy-MM-dd"),
        },
      }

      const { AnalyticsPDFExporter } = await import("@/lib/pdf-export")
      const exporter = new AnalyticsPDFExporter()
      await exporter.exportReport(reportData)

      toast({
        title: "Success",
        description: "Analytics report exported successfully",
      })
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast({
        title: "Error",
        description: "Failed to export PDF report",
        variant: "destructive",
      })
    } finally {
      setExportingPDF(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd")
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your TCG store performance and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={handleTimeframeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button onClick={exportToPDF} variant="outline" disabled={exportingPDF}>
            {exportingPDF ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.revenueLast30Days)}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{summary.ordersLast30Days.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+8.2%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Customers</p>
                <p className="text-2xl font-bold">{summary.newCustomersLast30Days.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+15.3%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.avgOrderValueLast30Days)}</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">-2.1%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="aov">Order Value</TabsTrigger>
          <TabsTrigger value="funnel">Conversion</TabsTrigger>
        </TabsList>

        {/* Revenue Report */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Daily revenue and order count for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis yAxisId="revenue" orientation="left" tickFormatter={(value) => `$${value}`} />
                    <YAxis yAxisId="orders" orientation="right" />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "revenue" ? formatCurrency(Number(value)) : value,
                        name === "revenue" ? "Revenue" : "Orders",
                      ]}
                      labelFormatter={(label) => format(new Date(label), "MMM dd, yyyy")}
                    />
                    <Legend />
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                      name="Revenue"
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orders"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Selling Products */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Products by revenue generated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                      <Bar dataKey="revenue" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Revenue distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topProducts.reduce(
                          (acc, product) => {
                            const existing = acc.find((item) => item.category === product.category)
                            if (existing) {
                              existing.revenue += product.revenue
                            } else {
                              acc.push({ category: product.category, revenue: product.revenue })
                            }
                            return acc
                          },
                          [] as { category: string; revenue: number }[],
                        )}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: { name?: string; percent?: number }) => `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {topProducts.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Product</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-right py-2">Units Sold</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={product.id} className="border-b">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-gray-600">{product.category}</td>
                        <td className="py-3 text-right">{product.unitsSold}</td>
                        <td className="py-3 text-right font-medium">{formatCurrency(product.revenue)}</td>
                        <td className="py-3 text-right">{formatCurrency(product.revenue / product.unitsSold)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Acquisition */}
        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Acquisition Trends</CardTitle>
              <CardDescription>New customer registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={customerAcquisition}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip labelFormatter={(label) => format(new Date(label), "MMM dd, yyyy")} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newCustomers"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="New Customers"
                    />
                    <Line
                      type="monotone"
                      dataKey="totalCustomers"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Total Customers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Average Order Value */}
        <TabsContent value="aov" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Average Order Value Trends</CardTitle>
              <CardDescription>Track how your average order value changes over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aovTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), "Average Order Value"]}
                      labelFormatter={(label) => format(new Date(label), "MMM dd, yyyy")}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="averageOrderValue"
                      stroke="#F59E0B"
                      strokeWidth={3}
                      name="Average Order Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversion Funnel */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Track user journey from product view to purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((step, index) => (
                  <div key={step.step} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium">{step.step}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                            style={{ width: `${step.conversionRate}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                            {step.conversionRate.toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-sm font-medium w-16 text-right">{step.count.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Conversion Insights</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Overall Conversion Rate:</span>
                    <div className="font-bold text-blue-600">
                      {funnelData.length > 0 ? funnelData[funnelData.length - 1].conversionRate.toFixed(2) : 0}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Cart Abandonment:</span>
                    <div className="font-bold text-orange-600">
                      {funnelData.length >= 3
                        ? (100 - (funnelData[2].count / funnelData[1].count) * 100).toFixed(1)
                        : 0}
                      %
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Checkout Completion:</span>
                    <div className="font-bold text-green-600">
                      {funnelData.length >= 4 ? ((funnelData[3].count / funnelData[2].count) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


