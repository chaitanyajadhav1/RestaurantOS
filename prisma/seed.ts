import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prisma = require("../src/lib/prisma").prisma

type AnyRecord = Record<string, string>

async function main() {
  console.log('🌱 Starting full hotel seed...')

  // ─── Idempotency check ───────────────────────────────────────────────────────
  const existing = await prisma.restaurant.findUnique({ where: { slug: 'the-golden-spoon' } })
  if (existing) {
    console.log('✅ Seed data for "The Golden Spoon" already exists. Skipping.')
    return
  }

  // ─── 1. Restaurant ───────────────────────────────────────────────────────────
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'The Golden Spoon',
      slug: 'the-golden-spoon',
      address: '42, MG Road, Koramangala, Bengaluru - 560034',
      phone: '+91 98765 43210',
      settings: {
        currency: '₹',
        tax: 5,
        avgWaitTime: 20,
        maxQueueSize: 60,
        paymentMethods: ['CASH', 'UPI', 'CARD'],
      },
    },
  })
  console.log(`🏨 Restaurant created: ${restaurant.name}`)

  // ─── 2. Staff Users ──────────────────────────────────────────────────────────
  const pw = await bcrypt.hash('password123', 10)
  const usersData = [
    { name: 'Rajesh Kumar',    email: 'restaurant_admin@demo.com',  role: 'SUPER_ADMIN'      },
    { name: 'Priya Sharma',    email: 'admin@demo.com',             role: 'RESTAURANT_ADMIN' },
    { name: 'Arun Menon',      email: 'manager@demo.com',           role: 'MANAGER'          },
    { name: 'Deepika Nair',    email: 'cashier@demo.com',           role: 'CASHIER'          },
    { name: 'Suresh Patil',    email: 'waiter@demo.com',            role: 'WAITER'           },
    { name: 'Lakshmi Iyer',    email: 'waiter2@demo.com',           role: 'WAITER'           },
    { name: 'Ramesh Yadav',    email: 'kitchen_staff@demo.com',     role: 'KITCHEN_STAFF'    },
    { name: 'Anitha Rao',      email: 'kitchen2@demo.com',          role: 'KITCHEN_STAFF'    },
  ] as const

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { restaurantId: restaurant.id, name: u.name, role: u.role },
      create: { restaurantId: restaurant.id, name: u.name, email: u.email, password: pw, role: u.role },
    })
  }
  console.log(`👥 ${usersData.length} staff users created/updated`)

  // ─── 3. Tables ───────────────────────────────────────────────────────────────
  const tablesData = [
    // Indoor
    { number: '1',  capacity: 2, location: 'Indoor',  status: 'AVAILABLE' },
    { number: '2',  capacity: 2, location: 'Indoor',  status: 'OCCUPIED'  },
    { number: '3',  capacity: 4, location: 'Indoor',  status: 'OCCUPIED'  },
    { number: '4',  capacity: 4, location: 'Indoor',  status: 'AVAILABLE' },
    { number: '5',  capacity: 4, location: 'Indoor',  status: 'OCCUPIED'  },
    { number: '6',  capacity: 6, location: 'Indoor',  status: 'RESERVED'  },
    { number: '7',  capacity: 6, location: 'Indoor',  status: 'OCCUPIED'  },
    { number: '8',  capacity: 2, location: 'Indoor',  status: 'CLEANING'  },
    { number: '9',  capacity: 4, location: 'Indoor',  status: 'AVAILABLE' },
    { number: '10', capacity: 8, location: 'Indoor - Private', status: 'OCCUPIED' },
    // Outdoor / Terrace
    { number: '11', capacity: 2, location: 'Terrace', status: 'AVAILABLE' },
    { number: '12', capacity: 2, location: 'Terrace', status: 'OCCUPIED'  },
    { number: '13', capacity: 4, location: 'Terrace', status: 'AVAILABLE' },
    { number: '14', capacity: 4, location: 'Terrace', status: 'OCCUPIED'  },
    { number: '15', capacity: 6, location: 'Terrace', status: 'AVAILABLE' },
    // Bar Seating
    { number: 'B1', capacity: 2, location: 'Bar',     status: 'OCCUPIED'  },
    { number: 'B2', capacity: 2, location: 'Bar',     status: 'AVAILABLE' },
    { number: 'B3', capacity: 2, location: 'Bar',     status: 'OCCUPIED'  },
  ] as const

  const tables: AnyRecord[] = []
  for (const t of tablesData) {
    const tbl = await prisma.table.create({
      data: { restaurantId: restaurant.id, number: t.number, capacity: t.capacity, location: t.location, status: t.status },
    })
    tables.push(tbl)
  }
  console.log(`🪑 ${tables.length} tables created`)

  // ─── 4. Menu ─────────────────────────────────────────────────────────────────
  const catNames = ['Soups & Salads', 'Starters', 'Main Course', 'Breads & Rice', 'Desserts', 'Beverages', 'Specials']
  const categoryRecords: Record<string, { id: string }> = {}
  for (let i = 0; i < catNames.length; i++) {
    const c = await prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, name: catNames[i], orderIndex: i + 1 },
    })
    categoryRecords[catNames[i]] = c
  }

  const menuItemsData = [
    // Soups & Salads
    { name: 'Tomato Basil Soup',       price: 180, type: 'Veg',     prep: 10, cat: 'Soups & Salads', desc: 'Classic tomato soup with fresh basil' },
    { name: 'Manchow Soup',            price: 200, type: 'Veg',     prep: 12, cat: 'Soups & Salads', desc: 'Spicy Indo-Chinese corn soup' },
    { name: 'Chicken Sweet Corn Soup', price: 240, type: 'Non-Veg', prep: 12, cat: 'Soups & Salads', desc: 'Creamy chicken and sweet corn soup' },
    { name: 'Greek Salad',             price: 220, type: 'Veg',     prep: 8,  cat: 'Soups & Salads', desc: 'Fresh veggies with feta cheese' },
    // Starters
    { name: 'Paneer Tikka',            price: 320, type: 'Veg',     prep: 20, cat: 'Starters', desc: 'Smoky marinated cottage cheese' },
    { name: 'Hara Bhara Kabab',        price: 280, type: 'Veg',     prep: 15, cat: 'Starters', desc: 'Spinach & peas patties' },
    { name: 'Veg Manchurian',          price: 260, type: 'Veg',     prep: 15, cat: 'Starters', desc: 'Fried veggie balls in soy sauce' },
    { name: 'Chicken Tikka',           price: 380, type: 'Non-Veg', prep: 20, cat: 'Starters', desc: 'Tandoor-roasted spiced chicken' },
    { name: 'Chicken 65',              price: 360, type: 'Non-Veg', prep: 18, cat: 'Starters', desc: 'Spicy deep-fried chicken' },
    { name: 'Fish Fingers',            price: 420, type: 'Non-Veg', prep: 18, cat: 'Starters', desc: 'Crispy battered fish strips' },
    { name: 'Prawns Koliwada',         price: 480, type: 'Non-Veg', prep: 20, cat: 'Starters', desc: 'Spiced fried prawns' },
    // Main Course
    { name: 'Paneer Butter Masala',    price: 380, type: 'Veg',     prep: 20, cat: 'Main Course', desc: 'Rich tomato-based paneer curry' },
    { name: 'Dal Makhani',             price: 320, type: 'Veg',     prep: 15, cat: 'Main Course', desc: 'Slow-cooked black lentil' },
    { name: 'Palak Paneer',            price: 360, type: 'Veg',     prep: 18, cat: 'Main Course', desc: 'Cottage cheese in spinach gravy' },
    { name: 'Chole Masala',            price: 300, type: 'Veg',     prep: 15, cat: 'Main Course', desc: 'Spiced chickpea curry' },
    { name: 'Butter Chicken',          price: 450, type: 'Non-Veg', prep: 22, cat: 'Main Course', desc: 'Creamy tomato chicken curry' },
    { name: 'Chicken Biryani',         price: 520, type: 'Non-Veg', prep: 30, cat: 'Main Course', desc: 'Fragrant basmati rice with chicken' },
    { name: 'Mutton Rogan Josh',       price: 580, type: 'Non-Veg', prep: 35, cat: 'Main Course', desc: 'Kashmiri-style lamb curry' },
    { name: 'Prawn Masala',            price: 560, type: 'Non-Veg', prep: 25, cat: 'Main Course', desc: 'Spicy coastal prawn curry' },
    { name: 'Veg Biryani',             price: 380, type: 'Veg',     prep: 25, cat: 'Main Course', desc: 'Aromatic vegetable biryani' },
    // Breads & Rice
    { name: 'Butter Naan',             price: 60,  type: 'Veg', prep: 8,  cat: 'Breads & Rice', desc: 'Soft leavened bread with butter' },
    { name: 'Garlic Naan',             price: 70,  type: 'Veg', prep: 8,  cat: 'Breads & Rice', desc: 'Naan topped with garlic and herbs' },
    { name: 'Tandoori Roti',           price: 40,  type: 'Veg', prep: 6,  cat: 'Breads & Rice', desc: 'Whole wheat tandoor-baked roti' },
    { name: 'Laccha Paratha',          price: 80,  type: 'Veg', prep: 10, cat: 'Breads & Rice', desc: 'Layered flaky flatbread' },
    { name: 'Steamed Rice',            price: 100, type: 'Veg', prep: 10, cat: 'Breads & Rice', desc: 'Plain steamed basmati rice' },
    { name: 'Jeera Rice',              price: 140, type: 'Veg', prep: 12, cat: 'Breads & Rice', desc: 'Cumin-tempered basmati rice' },
    // Desserts
    { name: 'Gulab Jamun',             price: 140, type: 'Veg', prep: 5,  cat: 'Desserts', desc: 'Soft dumplings in rose syrup (2 pcs)' },
    { name: 'Mango Kulfi',             price: 160, type: 'Veg', prep: 5,  cat: 'Desserts', desc: 'Indian ice cream with mango' },
    { name: 'Rasmalai',                price: 180, type: 'Veg', prep: 5,  cat: 'Desserts', desc: 'Cottage cheese dumplings in saffron milk' },
    { name: 'Chocolate Brownie',       price: 200, type: 'Veg', prep: 5,  cat: 'Desserts', desc: 'Warm brownie with vanilla ice cream' },
    // Beverages
    { name: 'Masala Chai',             price: 60,  type: 'Veg', prep: 5,  cat: 'Beverages', desc: 'Spiced Indian tea' },
    { name: 'Cold Coffee',             price: 160, type: 'Veg', prep: 5,  cat: 'Beverages', desc: 'Blended iced coffee with milk' },
    { name: 'Mango Lassi',             price: 140, type: 'Veg', prep: 5,  cat: 'Beverages', desc: 'Chilled mango yoghurt drink' },
    { name: 'Fresh Lime Soda',         price: 80,  type: 'Veg', prep: 3,  cat: 'Beverages', desc: 'Sweet or salted lime soda' },
    { name: 'Mineral Water',           price: 40,  type: 'Veg', prep: 1,  cat: 'Beverages', desc: '1 litre chilled water bottle' },
    { name: 'Coke / Pepsi',            price: 60,  type: 'Veg', prep: 1,  cat: 'Beverages', desc: '330 ml can' },
    // Chef Specials
    { name: 'Golden Spoon Thali',      price: 650, type: 'Veg',     prep: 25, cat: 'Specials', desc: 'Chef\'s complete vegetarian platter' },
    { name: 'Nawabi Chicken Handi',    price: 720, type: 'Non-Veg', prep: 35, cat: 'Specials', desc: 'Royal Mughlai chicken slow-cooked in handi' },
    { name: 'Hyderabadi Dum Biryani',  price: 680, type: 'Non-Veg', prep: 40, cat: 'Specials', desc: 'Slow dum-cooked Hyderabadi biryani' },
  ]

  const menuItems: Record<string, string> = {} // name → id
  for (const item of menuItemsData) {
    const created = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: categoryRecords[item.cat].id,
        name: item.name,
        description: item.desc,
        price: item.price,
        type: item.type,
        preparationTime: item.prep,
        isAvailable: true,
      },
    })
    menuItems[item.name] = created.id
  }
  console.log(`🍽️  ${menuItemsData.length} menu items created`)

  // ─── 5. Customers ────────────────────────────────────────────────────────────
  const customersData = [
    { name: 'Arjun Singh',      phone: '+91 99001 10001' },
    { name: 'Meera Krishnan',   phone: '+91 99001 10002' },
    { name: 'Vikram Joshi',     phone: '+91 99001 10003' },
    { name: 'Sneha Reddy',      phone: '+91 99001 10004' },
    { name: 'Kiran Patel',      phone: '+91 99001 10005' },
    { name: 'Ananya Thomas',    phone: '+91 99001 10006' },
    { name: 'Rohit Gupta',      phone: '+91 99001 10007' },
    { name: 'Divya Nair',       phone: '+91 99001 10008' },
    { name: 'Siddharth Bose',   phone: '+91 99001 10009' },
    { name: 'Pooja Mehta',      phone: '+91 99001 10010' },
    { name: 'Aditya Rao',       phone: '+91 99001 10011' },
    { name: 'Kavya Pillai',     phone: '+91 99001 10012' },
  ]

  const customers: AnyRecord[] = []
  for (const c of customersData) {
    const cust = await prisma.customer.create({
      data: { restaurantId: restaurant.id, name: c.name, phone: c.phone },
    })
    customers.push(cust)
  }
  console.log(`🧑‍🤝‍🧑 ${customers.length} customers created`)

  // ─── 6. Queue Entries ─────────────────────────────────────────────────────────
  const queueData = [
    { custIdx: 0, token: 'Q001', guests: 2, status: 'WAITING',   priority: 'NORMAL',   preference: 'Indoor' },
    { custIdx: 1, token: 'Q002', guests: 4, status: 'WAITING',   priority: 'NORMAL',   preference: 'Terrace' },
    { custIdx: 2, token: 'Q003', guests: 2, status: 'CALLED',    priority: 'PRIORITY',  preference: 'Indoor' },
    { custIdx: 3, token: 'Q004', guests: 6, status: 'WAITING',   priority: 'NORMAL',   preference: 'Indoor - Private' },
    { custIdx: 4, token: 'Q005', guests: 3, status: 'SEATED',    priority: 'NORMAL',   preference: 'Indoor' },
    { custIdx: 5, token: 'Q006', guests: 2, status: 'WAITING',   priority: 'NORMAL',   preference: 'Bar' },
    { custIdx: 6, token: 'Q007', guests: 4, status: 'COMPLETED', priority: 'NORMAL',   preference: 'Indoor' },
    { custIdx: 7, token: 'Q008', guests: 2, status: 'CANCELLED', priority: 'NORMAL',   preference: null },
  ] as const

  const queueEntries: AnyRecord[] = []
  for (const q of queueData) {
    const entry = await prisma.queueEntry.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customers[q.custIdx].id,
        tokenNumber: q.token,
        guests: q.guests,
        status: q.status,
        priority: q.priority,
        preference: q.preference,
      },
    })
    queueEntries.push(entry)
  }
  console.log(`🎟️  ${queueEntries.length} queue entries created`)

  // ─── 7. Orders ───────────────────────────────────────────────────────────────
  // Helper to find table by number
  const tableByNum = (num: string) => tables.find(t => t.number === num)!

  const tax = 5

  async function createOrder(opts: {
    custIdx: number
    tableNum?: string
    type: 'DINE_IN' | 'TAKEAWAY'
    status: string
    paymentStatus: string
    items: { name: string; qty: number }[]
    minutesAgo: number
    queueIdx?: number
  }) {
    const { custIdx, tableNum, type, status, paymentStatus, items, minutesAgo, queueIdx } = opts
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000)

    let subtotal = 0
    const resolvedItems = items.map(({ name, qty }) => {
      const itemDef = menuItemsData.find(m => m.name === name)!
      subtotal += itemDef.price * qty
      return { menuItemId: menuItems[name], quantity: qty, price: itemDef.price }
    })

    const taxAmt = (subtotal * tax) / 100
    const total = subtotal + taxAmt

    const order = await prisma.order.create({
      data: {
        restaurantId: restaurant.id,
        tableId: tableNum ? tableByNum(tableNum).id : null,
        customerId: customers[custIdx].id,
        queueId: queueIdx !== undefined ? queueEntries[queueIdx].id : null,
        status,
        type,
        subtotal,
        tax: taxAmt,
        total,
        paymentStatus,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: resolvedItems,
        },
      },
    })
    return { order, total }
  }

  // Today's active orders
  const orderResults = []

  orderResults.push(await createOrder({
    custIdx: 0, tableNum: '3', type: 'DINE_IN', status: 'PREPARING', paymentStatus: 'PENDING', minutesAgo: 25,
    items: [{ name: 'Paneer Tikka', qty: 1 }, { name: 'Butter Chicken', qty: 1 }, { name: 'Garlic Naan', qty: 3 }, { name: 'Mango Lassi', qty: 2 }],
  }))

  orderResults.push(await createOrder({
    custIdx: 1, tableNum: '5', type: 'DINE_IN', status: 'READY', paymentStatus: 'PENDING', minutesAgo: 45,
    items: [{ name: 'Chicken Tikka', qty: 1 }, { name: 'Mutton Rogan Josh', qty: 1 }, { name: 'Butter Naan', qty: 4 }, { name: 'Jeera Rice', qty: 2 }, { name: 'Coke / Pepsi', qty: 2 }],
  }))

  orderResults.push(await createOrder({
    custIdx: 2, tableNum: '7', type: 'DINE_IN', status: 'PLACED', paymentStatus: 'PENDING', minutesAgo: 5,
    items: [{ name: 'Tomato Basil Soup', qty: 2 }, { name: 'Hyderabadi Dum Biryani', qty: 1 }, { name: 'Raita', qty: 0 }, { name: 'Mango Lassi', qty: 1 }].filter(i => i.qty > 0),
  }))

  orderResults.push(await createOrder({
    custIdx: 3, tableNum: '10', type: 'DINE_IN', status: 'CONFIRMED', paymentStatus: 'PENDING', minutesAgo: 12,
    items: [{ name: 'Prawn Masala', qty: 1 }, { name: 'Nawabi Chicken Handi', qty: 1 }, { name: 'Chicken Biryani', qty: 1 }, { name: 'Garlic Naan', qty: 6 }, { name: 'Fresh Lime Soda', qty: 3 }],
  }))

  orderResults.push(await createOrder({
    custIdx: 4, tableNum: '2', type: 'DINE_IN', status: 'SERVED', paymentStatus: 'PENDING', minutesAgo: 60,
    items: [{ name: 'Dal Makhani', qty: 1 }, { name: 'Palak Paneer', qty: 1 }, { name: 'Laccha Paratha', qty: 2 }, { name: 'Steamed Rice', qty: 1 }, { name: 'Masala Chai', qty: 2 }],
  }))

  orderResults.push(await createOrder({
    custIdx: 5, tableNum: '12', type: 'DINE_IN', status: 'PREPARING', paymentStatus: 'PENDING', minutesAgo: 18,
    items: [{ name: 'Manchow Soup', qty: 2 }, { name: 'Chicken 65', qty: 1 }, { name: 'Butter Chicken', qty: 1 }, { name: 'Butter Naan', qty: 3 }],
  }))

  orderResults.push(await createOrder({
    custIdx: 6, tableNum: 'B1', type: 'DINE_IN', status: 'READY', paymentStatus: 'PENDING', minutesAgo: 30,
    items: [{ name: 'Fish Fingers', qty: 1 }, { name: 'Prawns Koliwada', qty: 1 }, { name: 'Cold Coffee', qty: 2 }],
  }))

  orderResults.push(await createOrder({
    custIdx: 7, tableNum: 'B3', type: 'DINE_IN', status: 'CONFIRMED', paymentStatus: 'PENDING', minutesAgo: 8,
    items: [{ name: 'Paneer Butter Masala', qty: 1 }, { name: 'Chole Masala', qty: 1 }, { name: 'Tandoori Roti', qty: 4 }, { name: 'Mango Lassi', qty: 2 }],
  }))

  // Completed + paid orders today
  const completedToday = [
    {
      custIdx: 8, tableNum: '1', type: 'DINE_IN' as const, status: 'COMPLETED', minutesAgo: 90,
      items: [{ name: 'Veg Biryani', qty: 1 }, { name: 'Hara Bhara Kabab', qty: 1 }, { name: 'Mineral Water', qty: 2 }],
    },
    {
      custIdx: 9, type: 'TAKEAWAY' as const, status: 'COMPLETED', minutesAgo: 70,
      items: [{ name: 'Chicken Biryani', qty: 2 }, { name: 'Coke / Pepsi', qty: 2 }],
    },
    {
      custIdx: 10, tableNum: '4', type: 'DINE_IN' as const, status: 'COMPLETED', minutesAgo: 120,
      items: [{ name: 'Golden Spoon Thali', qty: 2 }, { name: 'Masala Chai', qty: 2 }, { name: 'Gulab Jamun', qty: 2 }],
    },
    {
      custIdx: 11, tableNum: '9', type: 'DINE_IN' as const, status: 'COMPLETED', minutesAgo: 150,
      items: [{ name: 'Butter Chicken', qty: 1 }, { name: 'Dal Makhani', qty: 1 }, { name: 'Garlic Naan', qty: 3 }, { name: 'Mango Kulfi', qty: 2 }, { name: 'Masala Chai', qty: 2 }],
    },
    {
      custIdx: 0, type: 'TAKEAWAY' as const, status: 'COMPLETED', minutesAgo: 200,
      items: [{ name: 'Nawabi Chicken Handi', qty: 1 }, { name: 'Butter Naan', qty: 4 }],
    },
  ]

  for (const o of completedToday) {
    const result = await createOrder({ ...o, paymentStatus: 'PAID' })
    // Create payment record
    await prisma.payment.create({
      data: {
        restaurantId: restaurant.id,
        orderId: result.order.id,
        amount: result.total,
        method: ['CASH', 'UPI', 'CARD'][Math.floor(Math.random() * 3)],
        status: 'COMPLETED',
        createdAt: new Date(Date.now() - o.minutesAgo * 60 * 1000),
      },
    })
  }

  console.log(`📦 ${orderResults.length + completedToday.length} orders created (${orderResults.length} active, ${completedToday.length} completed with payments)`)

  // ─── 8. Summary ──────────────────────────────────────────────────────────────
  console.log('\n✅ Full seed complete! Here\'s your demo data:')
  console.log('─────────────────────────────────────────────')
  console.log('🏨  Hotel:        The Golden Spoon')
  console.log('👥  Staff Users:  8  (all password: password123)')
  console.log('   ┣ restaurant_admin@demo.com  → Super Admin')
  console.log('   ┣ admin@demo.com             → Restaurant Admin')
  console.log('   ┣ manager@demo.com           → Manager')
  console.log('   ┣ cashier@demo.com           → Cashier')
  console.log('   ┣ waiter@demo.com            → Waiter')
  console.log('   ┣ waiter2@demo.com           → Waiter')
  console.log('   ┣ kitchen_staff@demo.com     → Kitchen Staff')
  console.log('   ┗ kitchen2@demo.com          → Kitchen Staff')
  console.log('🪑  Tables:       18 (Indoor / Terrace / Bar) — mixed statuses')
  console.log('🍽️   Menu Items:   38 across 7 categories')
  console.log('🎟️   Queue:        8 entries (3 waiting, 1 called, 1 seated)')
  console.log(`📦  Orders:       13 (8 active at various stages, 5 completed & paid)`)
  console.log('─────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
