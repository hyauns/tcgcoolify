export interface Review {
  id: number
  customerName: string
  rating: number
  reviewText: string
  productName: string
  isVerified: boolean
  avatar?: string
  date: string
}

export function getAllReviews(): Review[] {
  return [
    {
      id: 1,
      customerName: "Alex Chen",
      rating: 5,
      reviewText:
        "Amazing quality cards! The packaging was perfect and shipping was incredibly fast. Will definitely order again.",
      productName: "Magic: The Gathering - Foundations Booster Box",
      isVerified: true,
      date: "2024-01-15",
    },
    {
      id: 2,
      customerName: "Sarah Johnson",
      rating: 5,
      reviewText:
        "Best prices I've found anywhere online. The customer service team was super helpful when I had questions about my order.",
      productName: "Pokemon TCG - Scarlet & Violet Booster Pack",
      isVerified: true,
      date: "2024-01-12",
    },
    {
      id: 3,
      customerName: "Mike Rodriguez",
      rating: 4,
      reviewText:
        "Great selection of cards and fast delivery. The only minor issue was the packaging could be a bit more secure, but cards arrived in perfect condition.",
      productName: "Yu-Gi-Oh! - 25th Anniversary Tin",
      isVerified: true,
      date: "2024-01-10",
    },
    {
      id: 4,
      customerName: "Emily Davis",
      rating: 5,
      reviewText:
        "I've been collecting for years and this is hands down the best online store I've used. Authentic cards, fair prices, and excellent service.",
      productName: "Disney Lorcana - The First Chapter Starter Deck",
      isVerified: true,
      date: "2024-01-08",
    },
    {
      id: 5,
      customerName: "David Kim",
      rating: 5,
      reviewText:
        "Ordered a rare card and it arrived exactly as described. The authentication process gives me confidence in every purchase.",
      productName: "Magic: The Gathering - Black Lotus (Alpha)",
      isVerified: true,
      date: "2024-01-05",
    },
    {
      id: 6,
      customerName: "Jessica Martinez",
      rating: 4,
      reviewText: "Love the pre-order system! Got my cards on release day and the exclusive bonuses were a nice touch.",
      productName: "One Piece Card Game - Romance Dawn Booster Box",
      isVerified: true,
      date: "2024-01-03",
    },
    {
      id: 7,
      customerName: "Ryan Thompson",
      rating: 5,
      reviewText:
        "The website is easy to navigate and the checkout process is smooth. My cards arrived in mint condition with excellent protective packaging.",
      productName: "Flesh and Blood - Outsiders Booster Box",
      isVerified: true,
      date: "2024-01-01",
    },
    {
      id: 8,
      customerName: "Amanda Wilson",
      rating: 5,
      reviewText:
        "Fantastic customer support! They helped me track down a specific card I'd been looking for months. Couldn't be happier with the service.",
      productName: "Pokemon TCG - Charizard ex Premium Collection",
      isVerified: true,
      date: "2023-12-28",
    },
    {
      id: 9,
      customerName: "Chris Brown",
      rating: 4,
      reviewText:
        "Good variety of products and competitive pricing. The loyalty program rewards are a nice bonus for frequent buyers like myself.",
      productName: "Magic: The Gathering - Commander Deck Bundle",
      isVerified: true,
      date: "2023-12-25",
    },
    {
      id: 10,
      customerName: "Lisa Garcia",
      rating: 5,
      reviewText:
        "I was skeptical about buying expensive cards online, but the verification process and return policy made me feel secure. Cards were exactly as advertised.",
      productName: "Yu-Gi-Oh! - Blue-Eyes White Dragon (LOB-001)",
      isVerified: true,
      date: "2023-12-22",
    },
    {
      id: 11,
      customerName: "Kevin Lee",
      rating: 5,
      reviewText:
        "The pre-order bonuses are incredible! Got exclusive sleeves and a playmat with my order. The quality exceeded my expectations.",
      productName: "Disney Lorcana - Rise of the Floodborn Booster Box",
      isVerified: true,
      date: "2023-12-20",
    },
    {
      id: 12,
      customerName: "Rachel Green",
      rating: 4,
      reviewText:
        "Great experience overall. The card grading service is professional and the turnaround time was faster than expected.",
      productName: "Pokemon TCG - Base Set Charizard PSA Grading",
      isVerified: true,
      date: "2023-12-18",
    },
    {
      id: 13,
      customerName: "Tom Anderson",
      rating: 5,
      reviewText:
        "Been a customer for over a year now. Consistently great service, authentic products, and they always have the latest releases in stock.",
      productName: "One Piece Card Game - Kingdoms of Intrigue Booster Pack",
      isVerified: true,
      date: "2023-12-15",
    },
    {
      id: 14,
      customerName: "Nicole White",
      rating: 5,
      reviewText:
        "The monthly subscription box is amazing! Always surprised by the rare cards and exclusive items. Best value for money I've found.",
      productName: "Epic Cards Monthly Mystery Box",
      isVerified: true,
      date: "2023-12-12",
    },
    {
      id: 15,
      customerName: "Jason Miller",
      rating: 4,
      reviewText:
        "Solid selection and fair prices. The tournament supplies section is particularly well-stocked. Will continue shopping here.",
      productName: "Flesh and Blood - Tournament Deck Box Set",
      isVerified: true,
      date: "2023-12-10",
    },
    {
      id: 16,
      customerName: "Stephanie Taylor",
      rating: 5,
      reviewText:
        "The customer service team went above and beyond to help me complete my collection. They even sourced a rare card from another location!",
      productName: "Magic: The Gathering - Vintage Masters Booster Pack",
      isVerified: true,
      date: "2023-12-08",
    },
    {
      id: 17,
      customerName: "Mark Johnson",
      rating: 5,
      reviewText:
        "Lightning fast shipping and cards always arrive in perfect condition. The protective packaging is top-notch.",
      productName: "Pokemon TCG - Japanese Booster Box",
      isVerified: true,
      date: "2023-12-05",
    },
    {
      id: 18,
      customerName: "Jennifer Adams",
      rating: 4,
      reviewText:
        "Great prices on sealed products and the return policy gives me peace of mind. Highly recommend for serious collectors.",
      productName: "Yu-Gi-Oh! - Tournament Pack Sealed Box",
      isVerified: true,
      date: "2023-12-03",
    },
    {
      id: 19,
      customerName: "Daniel Clark",
      rating: 5,
      reviewText:
        "The trade-in program is fantastic! Got great value for my old cards and used the credit towards new releases. Seamless process.",
      productName: "Disney Lorcana - Card Trade-In Program",
      isVerified: true,
      date: "2023-12-01",
    },
    {
      id: 20,
      customerName: "Michelle Roberts",
      rating: 5,
      reviewText:
        "Outstanding service from start to finish. The website is user-friendly, checkout is secure, and delivery is always on time. My go-to card store!",
      productName: "One Piece Card Game - Starter Deck Collection",
      isVerified: true,
      date: "2023-11-28",
    },
  ]
}
