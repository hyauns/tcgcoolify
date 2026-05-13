import "dotenv/config"
import { Resend } from "resend"

async function run() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error("❌ RESEND_API_KEY environment variable is missing.")
    process.exit(1)
  }

  const resend = new Resend(apiKey)
  
  // Use the verified domain as requested
  const from = process.env.EMAIL_FROM || "TCG Lore <orders@email.tcglore.com>"
  const reply_to = process.env.EMAIL_REPLY_TO || "cs@tcglore.com"
  const to = process.env.ADMIN_EMAIL || process.argv[2] || "orders@email.tcglore.com"

  console.log("=== Resend API Test ===")
  console.log(`API Key    : ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`)
  console.log(`From       : ${from}`)
  console.log(`Reply-To   : ${reply_to}`)
  console.log(`To         : ${to}`)
  console.log("-----------------------")

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo: reply_to,
      subject: "TCG Lore Script Test",
      html: "<p>If you see this, Resend API is working from the script.</p>",
    })

    if (error) {
      console.error("❌ Send failed:")
      console.error(error)
      process.exit(1)
    }

    console.log(`✅ Success! Message ID: ${data?.id}`)
  } catch (err) {
    console.error("❌ Exception during send:")
    console.error(err)
    process.exit(1)
  }
}

run()
