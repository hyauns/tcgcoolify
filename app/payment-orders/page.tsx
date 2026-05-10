import { Metadata } from 'next'
import PaymentOrdersPage from '../payment-and-orders/page'

export const metadata: Metadata = {
  title: 'Payment & Orders | TCG Lore',
  description: 'Understanding our secure payment process and order fulfillment',
  alternates: {
    canonical: 'https://www.tcglore.com/payment-and-orders',
  },
}

export default PaymentOrdersPage
