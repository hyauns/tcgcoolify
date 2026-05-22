import { render } from "@react-email/components"
import { sendEmailWithRetry, EMAIL_CONFIG } from "./resend-client"

// Import all email templates
import { OrderConfirmationTemplate, getOrderConfirmationText } from "./templates/order-confirmation"
import { WelcomeTemplate, getWelcomeText } from "./templates/welcome"
import { EmailVerificationTemplate, getEmailVerificationText } from "./templates/email-verification"
import { PasswordResetTemplate, getPasswordResetText } from "./templates/password-reset"
import { PasswordChangedTemplate, getPasswordChangedText } from "./templates/password-changed"
import { AdminOrderNotificationTemplate, getAdminOrderNotificationText } from "./templates/admin-order-notification"
import { OrderCancellationTemplate, getOrderCancellationText } from "./templates/order-cancellation"

// Types
export interface OrderEmailData {
  orderId: string
  orderNumber: string
  customerId: string
  customerEmail: string
  customerPhone?: string
  paymentMethodId: string
  transactionId: string
  authorizationCode?: string
  amount: number
  currency: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    image?: string
  }>
  shippingMethod: string
  shippingCost: number
  tax: number
  total: number
  orderDate: Date
  estimatedDelivery?: string
  shippingAddress: {
    name: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  trackingNumber?: string
}

export interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Main email sending functions
export async function sendOrderConfirmation(
  orderData: OrderEmailData,
  customerName?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log("[v0] sendOrderConfirmation: attempting to send to:", orderData.customerEmail)
  console.log("[v0] sendOrderConfirmation: orderNumber:", orderData.orderNumber, "| items:", orderData.items?.length)
  try {
    const html = await render(
      OrderConfirmationTemplate({
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        customerName: customerName || orderData.shippingAddress.name,
        items: orderData.items,
        subtotal: orderData.amount,
        shippingCost: orderData.shippingCost,
        tax: orderData.tax,
        total: orderData.total,
        currency: orderData.currency,
        estimatedDelivery: orderData.estimatedDelivery,
        shippingAddress: orderData.shippingAddress,
        trackingNumber: orderData.trackingNumber,
      }),
    )

    const text = getOrderConfirmationText({
      orderNumber: orderData.orderNumber,
      orderDate: orderData.orderDate,
      customerName: customerName || orderData.shippingAddress.name,
      items: orderData.items,
      subtotal: orderData.amount,
      shippingCost: orderData.shippingCost,
      tax: orderData.tax,
      total: orderData.total,
      currency: orderData.currency,
      estimatedDelivery: orderData.estimatedDelivery,
      shippingAddress: orderData.shippingAddress,
      trackingNumber: orderData.trackingNumber,
    })

    const result = await sendEmailWithRetry({
      to: orderData.customerEmail,
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      html,
      text,
    })
    console.log("[v0] sendOrderConfirmation: Resend result:", result)
    return result
  } catch (error) {
    console.error("[v0] sendOrderConfirmation: failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendOrderCancellation(
  params: {
    customerEmail: string
    customerName: string
    orderNumber: string
    cancelledAt?: Date
  },
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log("[v0] sendOrderCancellation: attempting to send to:", params.customerEmail)
  console.log("[v0] sendOrderCancellation: orderNumber:", params.orderNumber)
  try {
    const cancelledAt = params.cancelledAt ?? new Date()
    const html = await render(
      OrderCancellationTemplate({
        orderNumber: params.orderNumber,
        customerName: params.customerName,
        cancelledAt,
      }),
    )
    const text = getOrderCancellationText({
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      cancelledAt,
    })

    const result = await sendEmailWithRetry({
      to: params.customerEmail,
      subject: `Your TCG Lore order has been cancelled - ${params.orderNumber}`,
      html,
      text,
    })
    console.log("[v0] sendOrderCancellation: Resend result:", result)
    return result
  } catch (error) {
    console.error("[v0] sendOrderCancellation: failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendWelcomeEmail(
  user: UserData,
  discountCode?: string,
  discountAmount?: number,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const html = await render(
      WelcomeTemplate({
        firstName: user.firstName,
        email: user.email,
        discountCode,
        discountAmount,
      }),
    )

    const text = getWelcomeText({
      firstName: user.firstName,
      email: user.email,
      discountCode,
      discountAmount,
    })

    return await sendEmailWithRetry({
      to: user.email,
      subject: "Welcome to TCG Lore!",
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendVerificationEmail(
  user: UserData,
  verificationUrl: string,
  expiresInHours = 24,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const html = await render(
      EmailVerificationTemplate({
        firstName: user.firstName,
        email: user.email,
        verificationUrl,
        expiresInHours,
      }),
    )

    const text = getEmailVerificationText({
      firstName: user.firstName,
      email: user.email,
      verificationUrl,
      expiresInHours,
    })

    return await sendEmailWithRetry({
      to: user.email,
      subject: "Verify your TCG Lore email address",
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send verification email:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendPasswordResetEmail(
  user: UserData,
  resetUrl: string,
  expiresInHours = 1,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const html = await render(
      PasswordResetTemplate({
        firstName: user.firstName,
        email: user.email,
        resetUrl,
        expiresInHours,
        ipAddress,
        userAgent,
      }),
    )

    const text = getPasswordResetText({
      firstName: user.firstName,
      email: user.email,
      resetUrl,
      expiresInHours,
      ipAddress,
      userAgent,
    })

    return await sendEmailWithRetry({
      to: user.email,
      subject: "Reset your TCG Lore password",
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendPasswordChangedEmail(
  user: UserData,
  timestamp: Date,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const html = await render(
      PasswordChangedTemplate({
        firstName: user.firstName,
        email: user.email,
        timestamp,
        ipAddress,
        userAgent,
      }),
    )

    const text = getPasswordChangedText({
      firstName: user.firstName,
      email: user.email,
      timestamp,
      ipAddress,
      userAgent,
    })

    return await sendEmailWithRetry({
      to: user.email,
      subject: "Password changed - TCG Lore",
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send password changed email:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendAdminOrderNotification(
  orderData: OrderEmailData,
  customerName?: string,
  priority: "normal" | "high" | "urgent" = "normal",
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const html = await render(
      AdminOrderNotificationTemplate({
        orderNumber: orderData.orderNumber,
        orderId: orderData.orderId,
        customerName: customerName || orderData.shippingAddress.name,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        items: orderData.items,
        subtotal: orderData.amount,
        shippingCost: orderData.shippingCost,
        tax: orderData.tax,
        total: orderData.total,
        currency: orderData.currency,
        paymentMethod: "Credit Card", // This should come from payment data
        transactionId: orderData.transactionId,
        shippingAddress: orderData.shippingAddress,
        orderDate: orderData.orderDate,
        priority,
      }),
    )

    const text = getAdminOrderNotificationText({
      orderNumber: orderData.orderNumber,
      orderId: orderData.orderId,
      customerName: customerName || orderData.shippingAddress.name,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      items: orderData.items,
      subtotal: orderData.amount,
      shippingCost: orderData.shippingCost,
      tax: orderData.tax,
      total: orderData.total,
      currency: orderData.currency,
      paymentMethod: "Credit Card",
      transactionId: orderData.transactionId,
      shippingAddress: orderData.shippingAddress,
      orderDate: orderData.orderDate,
      priority,
    })

    const priorityPrefix = priority !== "normal" ? `[${priority.toUpperCase()}] ` : ""

    return await sendEmailWithRetry({
      to: EMAIL_CONFIG.adminEmail,
      subject: `${priorityPrefix}New Order Alert - ${orderData.orderNumber}`,
      html,
      text,
    })
  } catch (error) {
    console.error("Failed to send admin order notification:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Batch email sending for multiple recipients
export async function sendBulkEmail(
  recipients: string[],
  subject: string,
  html: string,
  text?: string,
): Promise<{
  success: boolean
  results: Array<{ email: string; success: boolean; messageId?: string; error?: string }>
}> {
  const results = []
  let overallSuccess = true

  for (const email of recipients) {
    const result = await sendEmailWithRetry({
      to: email,
      subject,
      html,
      text,
    })

    results.push({
      email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    })

    if (!result.success) {
      overallSuccess = false
    }

    // Add small delay between emails to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { success: overallSuccess, results }
}

// Email service object for backward compatibility
export const emailService = {
  async sendOrderCompletionNotification(orderData: OrderEmailData, request?: any): Promise<boolean> {
    try {
      const adminResult = await sendAdminOrderNotification(orderData)
      const customerResult = await sendOrderConfirmation(orderData)

      return adminResult.success && customerResult.success
    } catch (error) {
      console.error("Order completion notification failed:", error)
      return false
    }
  },

  async sendCustomerOrderConfirmation(orderData: OrderEmailData): Promise<boolean> {
    try {
      const result = await sendOrderConfirmation(orderData)
      return result.success
    } catch (error) {
      console.error("Customer order confirmation failed:", error)
      return false
    }
  },

  // Legacy functions for backward compatibility
  sendVerificationEmail: async (email: string, verificationUrl: string): Promise<void> => {
    const user = { id: "", firstName: "User", lastName: "", email }
    const result = await sendVerificationEmail(user, verificationUrl)
    if (!result.success) {
      throw new Error(result.error || "Failed to send verification email")
    }
  },

  sendPasswordResetEmail: async (email: string, resetUrl: string): Promise<void> => {
    const user = { id: "", firstName: "User", lastName: "", email }
    const result = await sendPasswordResetEmail(user, resetUrl)
    if (!result.success) {
      throw new Error(result.error || "Failed to send password reset email")
    }
  },

  sendWelcomeEmail: async (email: string, firstName: string): Promise<void> => {
    const user = { id: "", firstName, lastName: "", email }
    const result = await sendWelcomeEmail(user)
    if (!result.success) {
      throw new Error(result.error || "Failed to send welcome email")
    }
  },
}

export default emailService

// Queue system for reliable email delivery (basic implementation)
interface EmailJob {
  id: string
  type: "order_confirmation" | "welcome" | "verification" | "password_reset" | "password_changed" | "admin_notification"
  data: any
  attempts: number
  maxAttempts: number
  createdAt: Date
  scheduledAt: Date
}

class EmailQueue {
  private queue: EmailJob[] = []
  private processing = false

  async addJob(type: EmailJob["type"], data: any, maxAttempts = 3): Promise<string> {
    const job: EmailJob = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      scheduledAt: new Date(),
    }

    this.queue.push(job)
    this.processQueue()

    return job.id
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()
      if (!job) break

      try {
        await this.processJob(job)
      } catch (error) {
        console.error(`Failed to process email job ${job.id}:`, error)

        job.attempts++
        if (job.attempts < job.maxAttempts) {
          // Retry with exponential backoff
          job.scheduledAt = new Date(Date.now() + Math.pow(2, job.attempts) * 60000) // 2^attempts minutes
          this.queue.push(job)
        } else {
          console.error(`Email job ${job.id} failed after ${job.maxAttempts} attempts`)
        }
      }

      // Small delay between jobs
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.processing = false
  }

  private async processJob(job: EmailJob): Promise<void> {
    console.log(`Processing email job ${job.id} (${job.type})`)

    switch (job.type) {
      case "order_confirmation":
        await sendOrderConfirmation(job.data.orderData, job.data.customerName)
        break
      case "welcome":
        await sendWelcomeEmail(job.data.user, job.data.discountCode, job.data.discountAmount)
        break
      case "verification":
        await sendVerificationEmail(job.data.user, job.data.verificationUrl, job.data.expiresInHours)
        break
      case "password_reset":
        await sendPasswordResetEmail(
          job.data.user,
          job.data.resetUrl,
          job.data.expiresInHours,
          job.data.ipAddress,
          job.data.userAgent,
        )
        break
      case "password_changed":
        await sendPasswordChangedEmail(job.data.user, job.data.timestamp, job.data.ipAddress, job.data.userAgent)
        break
      case "admin_notification":
        await sendAdminOrderNotification(job.data.orderData, job.data.customerName, job.data.priority)
        break
      default:
        throw new Error(`Unknown email job type: ${job.type}`)
    }
  }
}

// Export singleton email queue
export const emailQueue = new EmailQueue()
