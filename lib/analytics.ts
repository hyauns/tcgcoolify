import { getSql } from "./db-client"

const getSqlConnection = () => getSql()

export interface RevenueData {
  date: string
  revenue: number
  orders: number
  averageOrderValue: number
}

export interface TopSellingProduct {
  id: number
  name: string
  category: string
  totalSold: number
  revenue: number
  unitsSold: number
}

export interface CustomerAcquisition {
  date: string
  newCustomers: number
  totalCustomers: number
}

export interface ConversionFunnelData {
  step: string
  count: number
  conversionRate: number
}

export interface AverageOrderValueTrend {
  date: string
  averageOrderValue: number
  orderCount: number
}

/**
 * Revenue report — daily revenue, order count, and AOV for the given date range.
 * Uses `orders` table with `order_date` (or `created_at` fallback), excludes CANCELLED.
 */
export async function getRevenueReport(startDate: string, endDate: string): Promise<RevenueData[]> {
  try {
    const connection = getSqlConnection()
    const result = await connection`
      SELECT 
        DATE(COALESCE(order_date, created_at)) as date,
        COALESCE(SUM(total_amount), 0) as revenue,
        COUNT(*) as orders,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM orders 
      WHERE COALESCE(order_date, created_at) >= ${startDate}::date 
        AND COALESCE(order_date, created_at) <= ${endDate}::date + interval '1 day'
        AND status != 'CANCELLED'
      GROUP BY DATE(COALESCE(order_date, created_at))
      ORDER BY date ASC
    `

    return result.map((row: any) => ({
      date: row.date,
      revenue: Number(row.revenue) || 0,
      orders: Number(row.orders) || 0,
      averageOrderValue: Number(row.average_order_value) || 0,
    }))
  } catch (error) {
    console.error("[analytics] Error fetching revenue report:", error)
    return []
  }
}

/**
 * Top selling products — by revenue from order_items joined to products & orders.
 * Excludes CANCELLED orders.
 */
export async function getTopSellingProducts(limit = 10): Promise<TopSellingProduct[]> {
  try {
    const connection = getSqlConnection()
    const result = await connection`
      SELECT 
        oi.product_id as id,
        oi.product_name as name,
        COALESCE(p.category, 'Uncategorized') as category,
        COUNT(oi.id) as total_sold,
        COALESCE(SUM(oi.total_price), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as units_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id::text = p.id::text
      WHERE o.status != 'CANCELLED'
      GROUP BY oi.product_id, oi.product_name, p.category
      ORDER BY revenue DESC
      LIMIT ${limit}
    `

    return result.map((row: any) => ({
      id: Number(row.id) || 0,
      name: row.name || "Unknown Product",
      category: row.category || "Uncategorized",
      totalSold: Number(row.total_sold) || 0,
      revenue: Number(row.revenue) || 0,
      unitsSold: Number(row.units_sold) || 0,
    }))
  } catch (error) {
    console.error("[analytics] Error fetching top selling products:", error)
    return []
  }
}

/**
 * Customer acquisition trends — new user registrations per day from the `users` table.
 * Uses `created_at` from the users table.
 */
export async function getCustomerAcquisitionTrends(startDate: string, endDate: string): Promise<CustomerAcquisition[]> {
  try {
    const connection = getSqlConnection()
    const result = await connection`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_customers,
        SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_customers
      FROM users
      WHERE created_at >= ${startDate}::date 
        AND created_at <= ${endDate}::date + interval '1 day'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    return result.map((row: any) => ({
      date: row.date,
      newCustomers: Number(row.new_customers) || 0,
      totalCustomers: Number(row.total_customers) || 0,
    }))
  } catch (error) {
    console.error("[analytics] Error fetching customer acquisition trends:", error)
    return []
  }
}

/**
 * Average order value trends — daily AOV from the orders table.
 */
export async function getAverageOrderValueTrends(
  startDate: string,
  endDate: string,
): Promise<AverageOrderValueTrend[]> {
  try {
    const connection = getSqlConnection()
    const result = await connection`
      SELECT 
        DATE(COALESCE(order_date, created_at)) as date,
        AVG(total_amount) as average_order_value,
        COUNT(*) as order_count
      FROM orders
      WHERE COALESCE(order_date, created_at) >= ${startDate}::date 
        AND COALESCE(order_date, created_at) <= ${endDate}::date + interval '1 day'
        AND status != 'CANCELLED'
      GROUP BY DATE(COALESCE(order_date, created_at))
      ORDER BY date ASC
    `

    return result.map((row: any) => ({
      date: row.date,
      averageOrderValue: Number(row.average_order_value) || 0,
      orderCount: Number(row.order_count) || 0,
    }))
  } catch (error) {
    console.error("[analytics] Error fetching AOV trends:", error)
    return []
  }
}

/**
 * Conversion funnel — derived from actual order data.
 * Since we don't have a `website_analytics` table, we estimate the funnel
 * from total products, orders with items, and completed orders.
 */
export async function getConversionFunnelData(): Promise<ConversionFunnelData[]> {
  try {
    const connection = getSqlConnection()

    const result = await connection`
      SELECT 
        (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
        (SELECT COUNT(DISTINCT order_id) FROM order_items) as orders_with_items,
        (SELECT COUNT(*) FROM orders WHERE status != 'CANCELLED') as total_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'DELIVERED') as delivered_orders,
        (SELECT COUNT(*) FROM orders WHERE payment_status = 'COMPLETED') as paid_orders
    `

    if (result.length === 0) {
      return []
    }

    const data = result[0]
    const totalOrders = Number(data.total_orders) || 0
    const ordersWithItems = Number(data.orders_with_items) || 0
    const paidOrders = Number(data.paid_orders) || 0
    const deliveredOrders = Number(data.delivered_orders) || 0

    // NOTE: We don't have a website_analytics table, so "Product Views"
    // and "Add to Cart" steps cannot be measured. We only report what we
    // can verify from the orders DB. Steps that cannot be measured are
    // excluded rather than fabricated.
    const funnelSteps: ConversionFunnelData[] = [
      {
        step: "Orders Created",
        count: totalOrders,
        conversionRate: 100,
      },
      {
        step: "Payment Completed",
        count: paidOrders,
        conversionRate: totalOrders > 0 ? (paidOrders / totalOrders) * 100 : 0,
      },
      {
        step: "Delivered",
        count: deliveredOrders,
        conversionRate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0,
      },
    ]

    return funnelSteps
  } catch (error) {
    console.error("[analytics] Error fetching conversion funnel data:", error)
    return []
  }
}

/**
 * Analytics summary — key metrics for the last 30 days.
 */
export async function getAnalyticsSummary() {
  try {
    const connection = getSqlConnection()
    const result = await connection`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE status != 'CANCELLED' AND COALESCE(order_date, created_at) >= CURRENT_DATE - INTERVAL '30 days') as orders_last_30_days,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'CANCELLED' AND COALESCE(order_date, created_at) >= CURRENT_DATE - INTERVAL '30 days') as revenue_last_30_days,
        (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_customers_last_30_days,
        (SELECT COALESCE(AVG(total_amount), 0) FROM orders WHERE status != 'CANCELLED' AND COALESCE(order_date, created_at) >= CURRENT_DATE - INTERVAL '30 days') as avg_order_value_last_30_days
    `

    if (result.length === 0) {
      return {
        ordersLast30Days: 0,
        revenueLast30Days: 0,
        newCustomersLast30Days: 0,
        avgOrderValueLast30Days: 0,
      }
    }

    const data = result[0]
    return {
      ordersLast30Days: Number(data.orders_last_30_days) || 0,
      revenueLast30Days: Number(data.revenue_last_30_days) || 0,
      newCustomersLast30Days: Number(data.new_customers_last_30_days) || 0,
      avgOrderValueLast30Days: Number(data.avg_order_value_last_30_days) || 0,
    }
  } catch (error) {
    console.error("[analytics] Error fetching analytics summary:", error)
    return {
      ordersLast30Days: 0,
      revenueLast30Days: 0,
      newCustomersLast30Days: 0,
      avgOrderValueLast30Days: 0,
    }
  }
}
