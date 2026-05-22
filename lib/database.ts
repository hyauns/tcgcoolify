import { getSql } from "./db-client"

const getSqlConnection = () => getSql()


export interface Customer {
  id: string
  email: string
  name: string
  phone?: string
  address?: any
  created_at: Date
  total_orders?: number
  total_spent?: number
}

export interface Order {
  id: string
  customer_id: string
  customer?: Customer
  items: any[]
  total: number
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  shipping?: any
  tracking?: string
  created_at: Date
  updated_at: Date
}

export interface AdminStats {
  totalRevenue: number
  ordersToday: number
  newCustomers: number
  conversionRate: number
}

export interface RevenueData {
  date: string
  revenue: number
}

export interface TopProduct {
  id: string
  name: string
  sales: number
  revenue: number
}

export interface OrderItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  total_price: number
}

export interface CreateOrderData {
  customer_id: string
  order_number: string
  status: string
  subtotal: number
  tax_amount: number
  shipping_amount: number
  total_amount: number
  payment_status: string
  items: OrderItem[]
  shipping_address?: any
  billing_address?: any
}

export const adminDb = {
  async getStats(): Promise<AdminStats> {
    const connection = getSqlConnection()

    const [revenue, ordersToday, newCustomers, conversionData] = await Promise.all([
      connection`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'CANCELLED'`,
      connection`SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURRENT_DATE`,
      connection`SELECT COUNT(*) as count FROM users WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'`,
      connection`
        SELECT
          (SELECT COUNT(*) FROM orders WHERE status != 'CANCELLED' AND COALESCE(order_date, created_at) >= CURRENT_DATE - INTERVAL '30 days') as recent_orders,
          (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_users
      `,
    ])

    // Conversion rate: orders / registered users in the last 30 days.
    // This is an order-to-registration ratio, NOT a true site-wide conversion
    // rate (which would require analytics/session tracking).
    const recentOrders = Number(conversionData[0]?.recent_orders || 0)
    const recentUsers = Number(conversionData[0]?.recent_users || 0)
    const conversionRate = recentUsers > 0
      ? Math.round((recentOrders / recentUsers) * 100 * 10) / 10
      : 0

    return {
      totalRevenue: Number(revenue[0]?.total || 0),
      ordersToday: Number(ordersToday[0]?.count || 0),
      newCustomers: Number(newCustomers[0]?.count || 0),
      conversionRate,
    }
  },

  async getRevenueData(): Promise<RevenueData[]> {
    const connection = getSqlConnection()

    const result = await connection`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM orders 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status != 'CANCELLED'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `

    return result.map((row: any) => ({
      date: row.date,
      revenue: Number(row.revenue),
    }))
  },

  async getTopProducts(): Promise<TopProduct[]> {
    const connection = getSqlConnection()

    const rows = await connection`
      SELECT
        oi.product_id AS id,
        oi.product_name AS name,
        COALESCE(SUM(oi.quantity), 0) AS sales,
        COALESCE(SUM(oi.total_price), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'CANCELLED'
      GROUP BY oi.product_id, oi.product_name
      ORDER BY revenue DESC
      LIMIT 5
    `

    return rows.map((row: any) => ({
      id: String(row.id),
      name: row.name || "Unknown Product",
      sales: Number(row.sales) || 0,
      revenue: Number(row.revenue) || 0,
    }))
  },

  async getOrders(page = 1, limit = 10, search?: string, status?: string): Promise<{ orders: Order[]; total: number }> {
    const connection = getSqlConnection()
    const searchParam = search ? `%${search}%` : null;
    const statusParam = status || null;
    const offset = (page - 1) * limit;

    // orders.customer_id stores customers.id (integer-as-string) per
    // app/api/orders/create/route.ts (resolveCustomerId / resolveGuestCustomerId
    // both INSERT into the customers table and write that id back). Joining
    // users would never match — the JOIN below targets customers.
    const countResult = await connection`
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN customers c ON c.id::text = o.customer_id::text
      WHERE (${searchParam}::text IS NULL OR o.order_number ILIKE ${searchParam} OR c.email ILIKE ${searchParam} OR c.first_name ILIKE ${searchParam} OR c.last_name ILIKE ${searchParam})
        AND (${statusParam}::text IS NULL OR o.status = ${statusParam})
    `;
    const total = Number(countResult[0]?.total || 0);

    const orders = await connection`
      SELECT
        o.*,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON c.id::text = o.customer_id::text
      WHERE (${searchParam}::text IS NULL OR o.order_number ILIKE ${searchParam} OR c.email ILIKE ${searchParam} OR c.first_name ILIKE ${searchParam} OR c.last_name ILIKE ${searchParam})
        AND (${statusParam}::text IS NULL OR o.status = ${statusParam})
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      orders: orders.map((order: any) => ({
        ...order,
        id: String(order.id),
        total: Number(order.total_amount),
        customer: {
          id: String(order.customer_id),
          name: order.customer_name?.trim() || "Guest",
          email: order.customer_email || "No Email",
        },
      })),
      total,
    }
  },

  async getOrderById(id: string): Promise<Order | null> {
    const connection = getSqlConnection()

    // See getOrders above — orders.customer_id targets customers.id, not users.user_id.
    const result = await connection`
      SELECT
        o.*,
        c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name,
        c.email as customer_email,
        c.id as customer_table_id
      FROM orders o
      LEFT JOIN customers c ON c.id::text = o.customer_id::text
      WHERE o.id = ${id}
    `

    if (result.length === 0) return null

    const order: any = result[0]

    // Fetch order_items separately so the admin details modal can render line
    // items. Frontend (app/admin/orders/page.tsx) expects each item to expose
    // { name, quantity, price }.
    const itemRows = await connection`
      SELECT id, product_id, product_name, quantity, unit_price, total_price
      FROM order_items
      WHERE order_id = ${Number(order.id)}
      ORDER BY id ASC
    `
    const items = itemRows.map((row: any) => ({
      id: String(row.id),
      product_id: String(row.product_id),
      name: row.product_name,
      price: Number(row.unit_price),
      quantity: Number(row.quantity),
      total_price: Number(row.total_price),
    }))

    return {
      ...order,
      id: String(order.id),
      total: Number(order.total_amount),
      items,
      customer: {
        id: String(order.customer_table_id ?? order.customer_id),
        name: order.customer_name?.trim() || "Guest",
        email: order.customer_email || "No Email",
      },
    }
  },

  async updateOrderStatus(id: string, status: string, tracking?: string): Promise<void> {
    const connection = getSqlConnection()
    await connection`
      UPDATE orders 
      SET status = ${status}, 
          tracking_number = ${tracking || null},
          updated_at = NOW()
      WHERE id = ${id}
    `
  },

  async getCustomers(page = 1, limit = 10, search?: string): Promise<{ customers: Customer[]; total: number }> {
    const connection = getSqlConnection()
    const searchParam = search ? `%${search}%` : null;
    const offset = (page - 1) * limit;

    const countResult = await connection`
      SELECT COUNT(*) as total 
      FROM users u 
      WHERE (${searchParam}::text IS NULL OR u.first_name ILIKE ${searchParam} OR u.last_name ILIKE ${searchParam} OR u.email ILIKE ${searchParam})
    `;
    const total = Number(countResult[0]?.total || 0);

    const customers = await connection`
      SELECT 
        u.user_id as id,
        u.first_name || ' ' || COALESCE(u.last_name, '') as name,
        u.email,
        u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.user_id::text = o.customer_id::text
      WHERE (${searchParam}::text IS NULL OR u.first_name ILIKE ${searchParam} OR u.last_name ILIKE ${searchParam} OR u.email ILIKE ${searchParam})
      GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.created_at
      ORDER BY u.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      customers: customers.map((customer: any) => ({
        id: customer.id,
        name: customer.name?.trim() || "Unnamed",
        email: customer.email,
        created_at: customer.created_at,
        total_orders: Number(customer.total_orders),
        total_spent: Number(customer.total_spent),
      })),
      total,
    }
  },

  async createOrder(orderData: CreateOrderData): Promise<Order> {
    const connection = getSqlConnection()

    // Ensure customer_id is a string (for both authenticated users and guests)
    const customerId = String(orderData.customer_id)

    // Insert order
    const [order] = await connection`
      INSERT INTO orders (
        customer_id, order_number, status, subtotal, tax_amount, 
        shipping_amount, total_amount, payment_status, shipping_address, 
        billing_address, order_date
      ) VALUES (
        ${customerId}, ${orderData.order_number}, ${orderData.status},
        ${orderData.subtotal}, ${orderData.tax_amount}, ${orderData.shipping_amount},
        ${orderData.total_amount}, ${orderData.payment_status}, 
        ${JSON.stringify(orderData.shipping_address)}, 
        ${JSON.stringify(orderData.billing_address)}, NOW()
      )
      RETURNING *
    `

    // Insert order items
    if (orderData.items && orderData.items.length > 0) {
      for (const item of orderData.items) {
        await connection`
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity, unit_price, total_price
          ) VALUES (
            ${order.id}, ${item.product_id || item.id}, ${item.name}, ${item.quantity}, 
            ${item.price}, ${item.total_price}
          )
        `
      }
    }

    console.log(`✅ Order ${orderData.order_number} saved to database with ${orderData.items?.length || 0} items`)

    return {
      id: order.id.toString(),
      customer_id: order.customer_id,
      items: orderData.items,
      total: Number(order.total_amount),
      status: order.status as any,
      created_at: order.order_date,
      updated_at: order.order_date,
    }
  },

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const connection = getSqlConnection()

    const orders = await connection`
      SELECT 
        o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = ${customerId}
      GROUP BY o.id
      ORDER BY o.order_date DESC
    `

    return orders.map((order: any) => ({
      id: order.id.toString(),
      customer_id: order.customer_id,
      items: order.items || [],
      total: Number(order.total_amount),
      status: order.status as "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED",
      created_at: order.order_date,
      updated_at: order.order_date,
      tracking: order.tracking_number,
    }))
  },
}
