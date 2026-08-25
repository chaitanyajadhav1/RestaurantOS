// Customer App API Service
// Connects to Next.js Backend with configurable base URL and auto-persistence

/**
 * Parses full restaurant URLs like:
 * "https://restaurant-os-bay.vercel.app/the-golden-spoon"
 * or base URLs like:
 * "https://restaurant-os-bay.vercel.app"
 */
export const parseServerAndSlug = (rawUrl?: string): { baseUrl: string; defaultSlug: string } => {
  const envUrl = rawUrl || import.meta.env.VITE_API_URL || '';
  const envSlug = import.meta.env.VITE_DEFAULT_SLUG || '';

  if (!envUrl || !envUrl.trim()) {
    return {
      baseUrl: window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin,
      defaultSlug: envSlug.trim() || 'main'
    };
  }

  let cleaned = envUrl.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);
    const origin = parsed.origin;
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const slugFromPath = pathParts[0];

    return {
      baseUrl: origin,
      defaultSlug: envSlug.trim() || slugFromPath || 'main'
    };
  } catch {
    return {
      baseUrl: cleaned.replace(/\/$/, ''),
      defaultSlug: envSlug.trim() || 'main'
    };
  }
};

const envConfig = parseServerAndSlug();

export const getBaseUrl = (): string => {
  return localStorage.getItem('API_BASE_URL') || envConfig.baseUrl;
};

export const setBaseUrl = (url: string) => {
  const parsed = parseServerAndSlug(url);
  localStorage.setItem('API_BASE_URL', parsed.baseUrl);
};

export const getDefaultSlug = (): string => {
  return envConfig.defaultSlug;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string; // 'Veg' | 'Non-Veg'
  image: string | null;
  isAvailable: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  orderIndex: number;
  items: MenuItem[];
};

export type StatusData = {
  state: "NONE" | "WAITING" | "CALLED" | "SEATED";
  queue: {
    id: string;
    tokenNumber: string;
    status: string;
    guests?: number;
    position: number;
    estimatedWaitMins: number;
  } | null;
  table: {
    tableId: string;
    tableNumber: string;
    orderStatus: string;
    orderId: string;
    partyLabel?: string;
    total: number;
    items: { name: string; quantity: number; price: number; specialInstructions?: string }[];
  } | null;
};

export type RestaurantInfo = {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  phone?: string | null;
  currency?: string;
};

export const api = {
  // Customer Login with Phone & Password
  async login(params: { phone: string; password: string; restaurantSlug: string }): Promise<{ id: string; name: string; phone: string; restaurantId: string; restaurantSlug: string }> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || json.message || 'Login failed');
    return json.data;
  },

  // Customer Signup
  async signup(params: { name: string; phone: string; password: string; restaurantSlug: string }): Promise<{ id: string; name: string; phone: string; restaurantId: string; restaurantSlug: string }> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/customer/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || json.message || 'Signup failed');
    return json.data;
  },

  // Fetch Restaurant & Menu
  async getRestaurantData(slug: string): Promise<{ restaurant: RestaurantInfo; categories: MenuCategory[] }> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/menu?slug=${slug}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch restaurant menu');
    return {
      restaurant: json.data.restaurant || { id: json.data.restaurantId, name: slug.toUpperCase(), slug, currency: '₹' },
      categories: json.data.categories || []
    };
  },

  // Customer Status (Queue + Table Order)
  async getCustomerStatus(restaurantId: string, phone: string): Promise<StatusData> {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/customer/status?restaurantId=${restaurantId}&phone=${encodeURIComponent(phone)}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to get customer status');
    return json.data;
  },

  // Join Queue
  async joinQueue(params: {
    restaurantId: string;
    phone: string;
    name: string;
    guests: number;
    preference?: string;
  }) {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to join queue');
    return json.data;
  },

  // Place Order / Add Dishes
  async placeOrder(params: {
    restaurantId: string;
    tableId?: string;
    orderId?: string;
    partyLabel?: string;
    customerPhone: string;
    customerName: string;
    items: { menuItemId: string; quantity: number; specialInstructions?: string }[];
  }) {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        type: 'DINE_IN'
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to place order');
    return json.data;
  },

  // Waiter Service Request (Service Bell)
  async sendServiceRequest(params: {
    restaurantId: string;
    tableId?: string;
    tableNumber?: string;
    requestType: 'WATER' | 'WAITER' | 'BILL' | 'CLEANING' | 'CUTLERY' | 'CUSTOM';
    customNote?: string;
  }) {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to send service request');
    return json.data;
  }
};
