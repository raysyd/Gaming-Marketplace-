import type { Category, Condition, Conversation, Listing, Message } from "./types";
import { artKindFor, slugify } from "./taxonomy";

/**
 * A generated catalogue big enough to exercise pagination, filtering and
 * sorting the way a live marketplace would. Replaced by Supabase rows once
 * real listings exist.
 */

const SELLERS = [
  { id: "u-marcus", name: "Marcus L.", rating: 4.9, sales: 63, city: "Sydney", state: "NSW", verified: true },
  { id: "u-dee", name: "Dee K.", rating: 5, sales: 118, city: "Melbourne", state: "VIC", verified: true },
  { id: "u-priya", name: "Priya S.", rating: 4.8, sales: 27, city: "Brisbane", state: "QLD", verified: true },
  { id: "u-owen", name: "Owen R.", rating: 4.6, sales: 12, city: "Perth", state: "WA", verified: false },
  { id: "u-jules", name: "Jules M.", rating: 4.7, sales: 41, city: "Adelaide", state: "SA", verified: true },
  { id: "u-sam", name: "Sam T.", rating: 4.5, sales: 8, city: "Canberra", state: "ACT", verified: false },
  { id: "u-nina", name: "Nina B.", rating: 4.9, sales: 76, city: "Hobart", state: "TAS", verified: true },
];

const GPUS = [
  { name: "RTX 5090 32GB", price: 4200, fps: 300, brand: "NVIDIA" },
  { name: "RTX 5080 16GB", price: 2450, fps: 275, brand: "NVIDIA" },
  { name: "RTX 4090 24GB", price: 2190, fps: 260, brand: "NVIDIA" },
  { name: "RTX 4080 SUPER 16GB", price: 1590, fps: 240, brand: "NVIDIA" },
  { name: "RTX 4070 Ti 12GB", price: 1090, fps: 200, brand: "NVIDIA" },
  { name: "RTX 4060 8GB", price: 549, fps: 145, brand: "NVIDIA" },
  { name: "RTX 3080 10GB", price: 595, fps: 165, brand: "NVIDIA" },
  { name: "RTX 3060 12GB", price: 339, fps: 120, brand: "NVIDIA" },
  { name: "RX 9070 XT 16GB", price: 1290, fps: 215, brand: "AMD" },
  { name: "RX 7900 XTX 24GB", price: 1069, fps: 210, brand: "AMD" },
  { name: "RX 7800 XT 16GB", price: 739, fps: 175, brand: "AMD" },
  { name: "Arc B580 12GB", price: 419, fps: 130, brand: "Intel" },
];

const CPUS = [
  { name: "Ryzen 9 9950X3D", price: 1290, brand: "AMD", cores: "16C / 32T" },
  { name: "Ryzen 7 9800X3D", price: 849, brand: "AMD", cores: "8C / 16T" },
  { name: "Ryzen 7 7800X3D", price: 629, brand: "AMD", cores: "8C / 16T" },
  { name: "Ryzen 5 7600X", price: 329, brand: "AMD", cores: "6C / 12T" },
  { name: "Core Ultra 9 285K", price: 949, brand: "Intel", cores: "24C / 24T" },
  { name: "Core i7-14700K", price: 579, brand: "Intel", cores: "20C / 28T" },
  { name: "Core i5-12400F", price: 189, brand: "Intel", cores: "6C / 12T" },
];

const CONDITIONS: Condition[] = ["New", "Like new", "Used", "Used", "For parts"];

let seed = 20260815;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();

let n = 0;
const nextId = () => `l-${String(++n).padStart(3, "0")}`;

function make(
  partial: Omit<
    Listing,
    | "id" | "slug" | "sellerId" | "sellerName" | "sellerRating" | "sellerSales"
    | "sellerVerified" | "location" | "state" | "createdAt" | "watchers"
    | "image" | "images" | "stock" | "category"
  > & { category?: Category }
): Listing {
  const s = pick(SELLERS);
  const id = nextId();
  const age = Math.floor(rand() * 45);
  return {
    id,
    slug: slugify(partial.title),
    category: (partial.category ?? artKindFor(partial.subcategorySlug)) as Category,
    image: `/products/${id}.jpg`,
    images: [`/products/${id}-2.jpg`, `/products/${id}-3.jpg`],
    sellerId: s.id,
    sellerName: s.name,
    sellerRating: s.rating,
    sellerSales: s.sales,
    sellerVerified: s.verified,
    location: `${s.city}, ${s.state}`,
    state: s.state,
    watchers: Math.floor(rand() * 220),
    stock: 1,
    createdAt: iso(age),
    ...partial,
  };
}

function buildPCs(): Listing[] {
  return GPUS.flatMap((gpu) => {
    const cpu = pick(CPUS);
    const ram = pick(["16GB DDR5-6000", "32GB DDR5-6000", "32GB DDR4-3600", "64GB DDR5-6000"]);
    const ssd = pick(["1TB NVMe Gen4", "2TB NVMe Gen4", "512GB NVMe", "4TB NVMe Gen4"]);
    const price = Math.round((gpu.price + cpu.price + 900) / 10) * 10;
    const discounted = rand() > 0.55;
    return [
      make({
        title: `${gpu.name} Build — ${cpu.name} / ${ram}`,
        categorySlug: "full-systems",
        subcategorySlug: "gaming-pcs",
        price,
        compareAt: discounted ? Math.round((price * 1.22) / 10) * 10 : undefined,
        condition: pick(CONDITIONS),
        brand: "Custom",
        fps1080p: gpu.fps,
        specs: [
          { label: "GPU", value: gpu.name },
          { label: "CPU", value: cpu.name },
          { label: "RAM", value: ram },
          { label: "SSD", value: ssd },
          { label: "PSU", value: pick(["750W Gold", "850W Gold", "1000W Platinum"]) },
        ],
        description:
          "Built and tested by the seller, wiped and reset before shipping. Original boxes for the main components are included where noted.",
        shipsFree: rand() > 0.35,
        acceptsOffers: rand() > 0.2,
      }),
    ];
  });
}

function buildGPUs(): Listing[] {
  return GPUS.map((gpu) => {
    const price = Math.round(gpu.price / 10) * 10;
    const discounted = rand() > 0.5;
    return make({
      title: `${gpu.brand} ${gpu.name}`,
      categorySlug: "pc-parts-and-components",
      subcategorySlug: "graphics-cards",
      price,
      compareAt: discounted ? Math.round((price * 1.18) / 10) * 10 : undefined,
      condition: pick(CONDITIONS),
      brand: gpu.brand,
      fps1080p: gpu.fps,
      specs: [
        { label: "VRAM", value: gpu.name.split(" ").slice(-1)[0] },
        { label: "Cooling", value: pick(["Triple fan", "Dual fan", "Blower", "AIO"]) },
        { label: "Slots", value: pick(["2-slot", "2.5-slot", "3-slot"]) },
        { label: "Length", value: `${260 + Math.floor(rand() * 60)}mm` },
      ],
      description:
        "Pulled from a working system. No mining, supported with an anti-sag bracket, thermals verified before listing.",
      shipsFree: rand() > 0.3,
      acceptsOffers: rand() > 0.15,
    });
  });
}

function buildCPUs(): Listing[] {
  return CPUS.map((cpu) =>
    make({
      title: `${cpu.brand} ${cpu.name}`,
      categorySlug: "pc-parts-and-components",
      subcategorySlug: "processors",
      price: cpu.price,
      condition: pick(CONDITIONS),
      brand: cpu.brand,
      specs: [
        { label: "Cores", value: cpu.cores },
        { label: "Socket", value: cpu.brand === "AMD" ? "AM5" : "LGA1851" },
        { label: "Cooler", value: pick(["Not included", "Stock included"]) },
      ],
      description: "Boxed, pins perfect, never delidded. Ran in a single system.",
      shipsFree: true,
      acceptsOffers: rand() > 0.25,
    })
  );
}

function buildMisc(): Listing[] {
  const items: [string, string, string, number, string][] = [
    ["Gaming Laptop — RTX 4070 / i9-13950HX", "full-systems", "gaming-laptops", 2450, "Razer"],
    ["Gaming Laptop — RTX 4060 / Ryzen 7 7840HS", "full-systems", "gaming-laptops", 1690, "ASUS"],
    ["Creator Workstation — RTX 4080 / 64GB", "full-systems", "workstations", 3890, "Custom"],
    ["32GB DDR5-6000 CL30 Kit", "pc-parts-and-components", "memory", 229, "G.Skill"],
    ["64GB DDR5-6400 CL32 Kit", "pc-parts-and-components", "memory", 429, "Corsair"],
    ["2TB NVMe Gen4 SSD", "pc-parts-and-components", "storage", 189, "Samsung"],
    ["4TB NVMe Gen4 SSD", "pc-parts-and-components", "storage", 379, "WD"],
    ["X670E Motherboard — AM5", "pc-parts-and-components", "motherboards", 349, "ASUS"],
    ["Z790 Motherboard — LGA1700", "pc-parts-and-components", "motherboards", 289, "MSI"],
    ["1000W Platinum PSU — ATX 3.1", "pc-parts-and-components", "power-supplies", 279, "Corsair"],
    ["850W Gold PSU — Fully Modular", "pc-parts-and-components", "power-supplies", 179, "Seasonic"],
    ['27" 1440p 360Hz QD-OLED', "peripherals", "monitors", 1120, "ASUS"],
    ['34" Ultrawide 240Hz OLED', "peripherals", "monitors", 1490, "LG"],
    ['24" 1080p 180Hz IPS', "peripherals", "monitors", 249, "AOC"],
    ["60% Analog Optical Keyboard", "peripherals", "keyboards", 225, "Wooting"],
    ["75% Hot-swap Mechanical Keyboard", "peripherals", "keyboards", 149, "Keychron"],
    ["Superlight Wireless Mouse — 60g", "peripherals", "mice", 139, "Logitech"],
    ["Wireless Esports Mouse — 54g", "peripherals", "mice", 165, "Razer"],
    ["Wireless Gaming Headset", "peripherals", "headsets", 189, "SteelSeries"],
    ["PlayStation 5 Slim Digital", "consoles", "playstation", 529, "Sony"],
    ["PlayStation 5 Pro", "consoles", "playstation", 1099, "Sony"],
    ["Xbox Series X 1TB", "consoles", "xbox", 549, "Microsoft"],
    ["Nintendo Switch 2", "consoles", "nintendo", 599, "Nintendo"],
    ["Steam Deck OLED 1TB", "consoles", "handhelds", 799, "Valve"],
    ["ROG Ally X", "consoles", "handhelds", 869, "ASUS"],
  ];

  return items.map(([title, cat, sub, price, brand]) => {
    const discounted = rand() > 0.6;
    return make({
      title,
      categorySlug: cat,
      subcategorySlug: sub,
      price,
      compareAt: discounted ? Math.round((price * 1.2) / 10) * 10 : undefined,
      condition: pick(CONDITIONS),
      brand,
      specs: [
        { label: "Brand", value: brand },
        { label: "Condition", value: "Verified by seller" },
        { label: "Warranty", value: pick(["None", "3 months left", "12 months left"]) },
      ],
      description:
        "Owned and used by the seller, cleaned and tested before listing. Ships in original packaging where available.",
      shipsFree: rand() > 0.4,
      acceptsOffers: rand() > 0.2,
    });
  });
}

export const DEMO_LISTINGS: Listing[] = [
  ...buildPCs(),
  ...buildGPUs(),
  ...buildCPUs(),
  ...buildMisc(),
];

export const DEMO_USER = { id: "u-you", name: "You", email: "demo@sidegrade.com.au" };

const first = DEMO_LISTINGS[12];
const second = DEMO_LISTINGS[0];
const third = DEMO_LISTINGS[40];

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: "c-1",
    listingId: first.id,
    listingTitle: first.title,
    listingImage: "",
    buyerId: "u-you",
    sellerId: first.sellerId,
    otherPartyName: first.sellerName,
    lastMessage: `I can do ${Math.round(first.price * 0.95)} if you can pay today.`,
    updatedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    unread: 1,
  },
  {
    id: "c-2",
    listingId: second.id,
    listingTitle: second.title,
    listingImage: "",
    buyerId: "u-you",
    sellerId: second.sellerId,
    otherPartyName: second.sellerName,
    lastMessage: "Boxes are all in the shed, I'll grab photos tonight.",
    updatedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    unread: 0,
  },
  {
    id: "c-3",
    listingId: third.id,
    listingTitle: third.title,
    listingImage: "",
    buyerId: "u-you",
    sellerId: third.sellerId,
    otherPartyName: third.sellerName,
    lastMessage: "Shipped — tracking is in your orders tab.",
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    unread: 0,
  },
];

export const DEMO_MESSAGES: Record<string, Message[]> = {
  "c-1": [
    {
      id: "m-1",
      conversationId: "c-1",
      senderId: "u-you",
      body: "Hey — is this still available? Any coil whine?",
      createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
    },
    {
      id: "m-2",
      conversationId: "c-1",
      senderId: first.sellerId,
      body: "Still here. Barely any whine, only audible at 400+ fps in menus. Happy to send a video with the side panel off.",
      createdAt: new Date(Date.now() - 48 * 60000).toISOString(),
    },
    {
      id: "m-3",
      conversationId: "c-1",
      senderId: "u-you",
      body: "That'd help. Would you take a bit less?",
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: "m-4",
      conversationId: "c-1",
      senderId: "u-you",
      body: "Offer sent",
      kind: "offer",
      offerAmount: Math.round(first.price * 0.92),
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    },
    {
      id: "m-5",
      conversationId: "c-1",
      senderId: first.sellerId,
      body: `I can do ${Math.round(first.price * 0.95)} if you can pay today.`,
      createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    },
  ],
  "c-2": [
    {
      id: "m-6",
      conversationId: "c-2",
      senderId: "u-you",
      body: "Do you still have the original GPU box? Makes resale easier down the line.",
      createdAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    },
    {
      id: "m-7",
      conversationId: "c-2",
      senderId: second.sellerId,
      body: "Boxes are all in the shed, I'll grab photos tonight.",
      createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    },
  ],
  "c-3": [
    {
      id: "m-8",
      conversationId: "c-3",
      senderId: third.sellerId,
      body: "Shipped — tracking is in your orders tab.",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ],
};
