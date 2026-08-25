import { useState, useEffect, useCallback } from 'react';
import { 
  Utensils, Users, Clock, ShoppingBag, Bell, Droplets, 
  Receipt, CheckCircle2, ArrowRight, Plus, Minus, 
  Search, X, Ticket, LogOut, Loader2, RefreshCw,
  Sun, Moon
} from 'lucide-react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { 
  api, 
  type MenuCategory, 
  type StatusData, 
  type RestaurantInfo 
} from '../services/api';

interface CustomerAppViewProps {
  restaurant: RestaurantInfo;
  categories: MenuCategory[];
  customerName: string;
  customerPhone: string;
  currency?: string;
  onDisconnect: () => void;
  onRefreshMenu?: () => void;
}

export function CustomerAppView({
  restaurant,
  categories,
  customerName,
  customerPhone,
  currency = '₹',
  onDisconnect,
  onRefreshMenu
}: CustomerAppViewProps) {
  // App Navigation: 'menu' | 'status' | 'bill' | 'service'
  const [activeTab, setActiveTab] = useState<'menu' | 'status' | 'bill' | 'service'>('menu');

  // Status & Live Polling
  const [statusData, setStatusData] = useState<StatusData | null>(null);

  // Cart State: { [menuItemId]: quantity }
  const [cart, setCart] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [vegOnly, setVegOnly] = useState(false);

  // Join Queue Form State
  const [guestsCount, setGuestsCount] = useState(2);
  const [queuePreference, setQueuePreference] = useState('');
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);

  // Custom Service Request Note
  const [customRequestText, setCustomRequestText] = useState('');
  const [isSendingService, setIsSendingService] = useState(false);
  const [serviceDispatchedType, setServiceDispatchedType] = useState<string | null>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ title: string; desc?: string; type?: 'success' | 'error' } | null>(null);

  // Theme State (Light / Dark)
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const showToast = (title: string, desc?: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Safe Haptic Trigger
  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      await Haptics.impact({ style });
    } catch {
      // Browser fallback (noop)
    }
  };

  // Safe Notification Haptic
  const triggerNotificationHaptic = async (type: NotificationType = NotificationType.Success) => {
    try {
      await Haptics.notification({ type });
    } catch {
      // Browser fallback
    }
  };

  // Fetch Live Status
  const fetchStatus = useCallback(async (silent = false) => {
    try {
      const data = await api.getCustomerStatus(restaurant.id, customerPhone);
      setStatusData(prev => {
        if (prev && prev.state !== data.state) {
          if (data.state === 'CALLED' || data.state === 'SEATED') {
            triggerNotificationHaptic(NotificationType.Success);
          }
        }
        return data;
      });
    } catch (err) {
      if (!silent) console.warn('Status fetch note:', err);
    }
  }, [restaurant.id, customerPhone]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => fetchStatus(true), 4000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Cart calculations
  const allItems = categories.flatMap(c => c.items);
  const getItem = (id: string) => allItems.find(i => i.id === id);

  const cartEntries = Object.entries(cart).map(([id, qty]) => ({
    item: getItem(id)!,
    quantity: qty
  })).filter(e => e.item);

  const cartItemsCount = cartEntries.reduce((sum, e) => sum + e.quantity, 0);
  const cartSubtotal = cartEntries.reduce((sum, e) => sum + (e.item.price * e.quantity), 0);
  const taxRate = 5;
  const taxAmount = Math.round((cartSubtotal * (taxRate / 100)) * 100) / 100;
  const cartTotal = cartSubtotal + taxAmount;

  const updateQuantity = (itemId: string, delta: number) => {
    triggerHaptic(ImpactStyle.Light);
    setCart(prev => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  // Place Order
  const handlePlaceOrder = async () => {
    if (cartItemsCount === 0) return;
    setIsOrdering(true);
    triggerHaptic(ImpactStyle.Heavy);

    try {
      const itemsPayload = cartEntries.map(e => ({
        menuItemId: e.item.id,
        quantity: e.quantity,
        specialInstructions: specialInstructions.trim() || undefined
      }));

      await api.placeOrder({
        restaurantId: restaurant.id,
        tableId: statusData?.table?.tableId,
        orderId: statusData?.table?.orderId,
        partyLabel: statusData?.table?.partyLabel,
        customerPhone,
        customerName,
        items: itemsPayload
      });

      triggerNotificationHaptic(NotificationType.Success);
      setCart({});
      setSpecialInstructions('');
      setIsCartOpen(false);
      setOrderSuccessModal(true);
      fetchStatus(false);
    } catch (err: any) {
      showToast('Order failed', err.message || 'Network error', 'error');
    } finally {
      setIsOrdering(false);
    }
  };

  // Join Queue
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoiningQueue(true);
    triggerHaptic(ImpactStyle.Medium);
    try {
      const data = await api.joinQueue({
        restaurantId: restaurant.id,
        phone: customerPhone,
        name: customerName,
        guests: guestsCount,
        preference: queuePreference || undefined
      });
      triggerNotificationHaptic(NotificationType.Success);
      showToast(`Token #${data.tokenNumber} Allocated!`, 'You are now on the waitlist.');
      fetchStatus(false);
      setActiveTab('status');
    } catch (err: any) {
      showToast('Could not join waitlist', err.message || 'Please try again', 'error');
    } finally {
      setIsJoiningQueue(false);
    }
  };

  // Service Quick Actions
  const handleCallService = async (actionName: string, icon: string) => {
    const tableId = statusData?.table?.tableId;
    if (!tableId) {
      showToast('Table Not Assigned', 'Please ensure you are seated at a table to request staff service.', 'error');
      return;
    }

    let reqType: 'WATER' | 'WAITER' | 'BILL' | 'CLEANING' | 'CUTLERY' | 'CUSTOM' = 'WAITER';
    let notes: string | undefined = undefined;

    if (actionName.toLowerCase().includes('water')) {
      reqType = 'WATER';
    } else if (actionName.toLowerCase().includes('bill')) {
      reqType = 'BILL';
    } else if (actionName.toLowerCase().includes('clean')) {
      reqType = 'CLEANING';
    } else if (actionName.toLowerCase().includes('cutlery') || actionName.toLowerCase().includes('plate')) {
      reqType = 'CUTLERY';
      notes = 'Extra Cutlery & Napkins';
    }

    setIsSendingService(true);
    triggerHaptic(ImpactStyle.Medium);
    try {
      await api.sendServiceRequest({
        restaurantId: restaurant.id,
        tableId,
        tableNumber: statusData?.table?.tableNumber,
        requestType: reqType,
        customNote: notes
      });
      triggerNotificationHaptic(NotificationType.Success);
      setServiceDispatchedType(actionName);
      showToast(`${icon} ${actionName} Requested!`, `Staff will arrive at Table ${statusData.table?.tableNumber} shortly.`);
      setTimeout(() => setServiceDispatchedType(null), 7000);
    } catch (err: any) {
      showToast('Service Request Failed', err.message || 'Please call waiter in person.', 'error');
    } finally {
      setIsSendingService(false);
    }
  };

  // Custom Service Send
  const handleSendCustomService = async () => {
    if (!customRequestText.trim()) return;
    const tableId = statusData?.table?.tableId;
    if (!tableId) {
      showToast('Table Not Assigned', 'Please ensure you are seated at a table to request staff service.', 'error');
      return;
    }

    setIsSendingService(true);
    triggerHaptic(ImpactStyle.Medium);
    try {
      await api.sendServiceRequest({
        restaurantId: restaurant.id,
        tableId,
        tableNumber: statusData?.table?.tableNumber,
        requestType: 'CUSTOM',
        customNote: customRequestText.trim()
      });
      triggerNotificationHaptic(NotificationType.Success);
      showToast('Request Dispatched', 'Staff has received your note.');
      setCustomRequestText('');
    } catch (err: any) {
      showToast('Request Failed', err.message || 'Could not send note.', 'error');
    } finally {
      setIsSendingService(false);
    }
  };

  // Filter items
  const filteredCategories = categories.map(cat => {
    if (selectedCatId !== 'ALL' && cat.id !== selectedCatId) return null;

    const items = cat.items.filter(item => {
      if (vegOnly && item.type.toLowerCase().includes('non')) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
      }
      return true;
    });

    if (items.length === 0) return null;
    return { ...cat, items };
  }).filter(Boolean) as MenuCategory[];

  const isSeated = statusData?.state === 'SEATED' && statusData.table;
  const isWaitingInQueue = statusData?.state === 'WAITING' || statusData?.state === 'CALLED';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col justify-between shadow-2xl relative border-x border-stone-200 dark:border-zinc-800 select-none">
      {/* TOAST POPUP */}
      {toastMessage && (
        <div className={`fixed top-4 inset-x-4 z-50 p-4 rounded-2xl border shadow-2xl flex items-start space-x-3 transition-all animate-modal ${
          toastMessage.type === 'error' 
            ? 'bg-rose-950/90 border-rose-800 text-rose-100' 
            : 'bg-emerald-950/90 border-emerald-800 text-emerald-100'
        }`}>
          {toastMessage.type === 'error' ? (
            <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm">{toastMessage.title}</p>
            {toastMessage.desc && <p className="opacity-80 mt-0.5">{toastMessage.desc}</p>}
          </div>
        </div>
      )}

      {/* ─── 1. APP HEADER BAR ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-stone-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-md shadow-amber-500/20">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-zinc-900 dark:text-white leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {customerName ? `Hi, ${customerName}` : 'Guest Diner'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {isSeated && (
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Table {statusData.table!.tableNumber}
              {statusData.table!.partyLabel && ` (Grp ${statusData.table!.partyLabel})`}
            </span>
          )}

          {isWaitingInQueue && (
            <span className="bg-amber-500 text-zinc-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Token {statusData.queue?.tokenNumber}
            </span>
          )}

          {onRefreshMenu && (
            <button
              onClick={() => {
                triggerHaptic(ImpactStyle.Light);
                onRefreshMenu();
                showToast('Refreshing Menu...', 'Fetching latest catalog');
              }}
              className="w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-stone-200 transition-colors"
              title="Refresh Menu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-stone-200 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          <button
            onClick={onDisconnect}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
            title="Switch Restaurant"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN APP CONTENT CONTAINER ────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-4">
        
        {/* ========================================================================= */}
        {/* TAB 1: MENU & ORDERING */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            
            {/* Seated Table Banner */}
            {isSeated ? (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-15">
                  <Utensils className="w-24 h-24" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <span className="bg-white/20 backdrop-blur-md text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Seated at Table {statusData.table!.tableNumber}
                    </span>
                    <h2 className="text-xl font-black mt-1">Ready to Order</h2>
                    <p className="text-xs text-emerald-100 mt-0.5">Dishes ordered will be sent directly to your table.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('bill')}
                    className="bg-white text-emerald-900 font-extrabold text-xs px-3 py-2 rounded-xl shadow-md active:scale-95 transition-transform"
                  >
                    View Bill →
                  </button>
                </div>
              </div>
            ) : isWaitingInQueue ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="bg-white/20 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                      Waitlist Token #{statusData.queue?.tokenNumber}
                    </span>
                    <h2 className="text-xl font-black mt-1">Pre-select Your Dishes</h2>
                    <p className="text-xs text-amber-100 mt-0.5">Browse and prepare your order while waiting for your table.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('status')}
                    className="bg-white text-orange-950 font-extrabold text-xs px-3 py-2 rounded-xl shadow-md active:scale-95 transition-transform"
                  >
                    Wait Status
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-4 text-white shadow-md flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-amber-400">Join the Waitlist</h3>
                  <p className="text-xs text-zinc-300">Get your queue token before you arrive.</p>
                </div>
                <button
                  onClick={() => setActiveTab('status')}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md active:scale-95"
                >
                  Get Token →
                </button>
              </div>
            )}

            {/* Sticky Search & Veg Filter */}
            <div className="sticky top-14 z-20 bg-stone-50/95 dark:bg-zinc-950/95 backdrop-blur-md py-2 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    placeholder="Search delicious food & drinks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 h-9 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setVegOnly(!vegOnly);
                    triggerHaptic(ImpactStyle.Light);
                  }}
                  className={`px-3 h-9 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ${
                    vegOnly 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-white' : 'bg-emerald-500'}`} />
                  <span>Veg</span>
                </button>
              </div>

              {/* Horizontal Category Slider */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => {
                    setSelectedCatId('ALL');
                    triggerHaptic(ImpactStyle.Light);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                    selectedCatId === 'ALL'
                      ? 'bg-amber-500 text-zinc-950 shadow-xs scale-[1.02]'
                      : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  All Items
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCatId(cat.id);
                      triggerHaptic(ImpactStyle.Light);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                      selectedCatId === cat.id
                        ? 'bg-amber-500 text-zinc-950 shadow-xs scale-[1.02]'
                        : 'bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="space-y-6">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-stone-200 dark:border-zinc-800 text-stone-400">
                  <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No dishes found</p>
                  <p className="text-xs mt-1">Try another search keyword</p>
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-serif font-bold text-lg text-amber-600 dark:text-amber-400 tracking-wide">
                        {category.name}
                      </h2>
                      <span className="text-[10px] text-zinc-400 font-semibold">{category.items.length} dishes</span>
                    </div>

                    <div className="space-y-2.5">
                      {category.items.map((item) => {
                        const qtyInCart = cart[item.id] || 0;
                        const isVeg = item.type.toLowerCase().includes('veg') && !item.type.toLowerCase().includes('non');

                        return (
                          <div
                            key={item.id}
                            className={`bg-white dark:bg-zinc-900 border rounded-2xl p-3.5 transition-all shadow-2xs flex items-center justify-between gap-3 ${
                              qtyInCart > 0 
                                ? 'border-amber-400 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-400/40' 
                                : 'border-stone-200 dark:border-zinc-800 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 mb-1">
                                {isVeg ? (
                                  <span className="w-3.5 h-3.5 border-2 border-emerald-600 flex items-center justify-center p-[1px] rounded-xs shrink-0">
                                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                                  </span>
                                ) : (
                                  <span className="w-3.5 h-3.5 border-2 border-rose-600 flex items-center justify-center p-[1px] rounded-xs shrink-0">
                                    <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                                  </span>
                                )}
                                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                  {item.name}
                                </h3>
                              </div>

                              {item.description && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                  {item.description}
                                </p>
                              )}

                              <div className="font-bold font-serif text-amber-600 dark:text-amber-400 text-sm mt-1">
                                {currency}{item.price.toFixed(0)}
                              </div>
                            </div>

                            {/* Stepper Button */}
                            <div className="shrink-0">
                              {qtyInCart === 0 ? (
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="h-8 px-3.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs rounded-xl shadow-xs active:scale-90 transition-transform flex items-center"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1 font-extrabold" /> ADD
                                </button>
                              ) : (
                                <div className="flex items-center space-x-1.5 bg-amber-500 text-zinc-950 rounded-xl px-2 py-1 shadow-xs">
                                  <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="p-1 hover:bg-amber-600 rounded-lg active:scale-75"
                                  >
                                    <Minus className="w-3 h-3 font-black" />
                                  </button>
                                  <span className="font-black text-xs min-w-[16px] text-center">
                                    {qtyInCart}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="p-1 hover:bg-amber-600 rounded-lg active:scale-75"
                                  >
                                    <Plus className="w-3 h-3 font-black" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE STATUS & WAITLIST */}
        {/* ========================================================================= */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            
            {/* Seated Table View */}
            {isSeated ? (
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="bg-white/20 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    You Are Seated
                  </span>
                  <Utensils className="w-6 h-6 text-emerald-200" />
                </div>

                <div>
                  <h2 className="text-3xl font-black">Table {statusData.table!.tableNumber}</h2>
                  <p className="text-emerald-100 text-xs mt-1">
                    Your dine-in table is active. You can order dishes anytime from the menu.
                  </p>
                </div>

                <div className="p-3 bg-white/10 rounded-2xl border border-white/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-200">Kitchen Order Status</span>
                    <p className="font-black text-base">{statusData.table!.orderStatus.replace('_', ' ')}</p>
                  </div>
                  <span className="text-sm font-extrabold bg-white text-emerald-950 px-3 py-1 rounded-xl">
                    {currency}{statusData.table!.total.toFixed(0)}
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('menu')}
                  className="w-full bg-white text-emerald-950 font-black h-11 rounded-2xl hover:bg-emerald-50 active:scale-98 transition-all flex items-center justify-center space-x-1"
                >
                  <span>Browse Menu & Add Dishes →</span>
                </button>
              </div>
            ) : isWaitingInQueue ? (
              
              /* Waiting in Line Tracker */
              <div className="space-y-4">
                <div className={`rounded-3xl p-6 text-white shadow-xl ${
                  statusData.queue?.status === 'CALLED'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 animate-pulse'
                    : 'bg-gradient-to-br from-amber-500 to-orange-600'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-white/20 text-xs font-black px-3 py-1 rounded-full uppercase">
                      {statusData.queue?.status === 'CALLED' ? '📢 Table Ready!' : 'In Waitlist Line'}
                    </span>
                    <Ticket className="w-6 h-6 text-white/80" />
                  </div>

                  <div className="text-center py-2">
                    <p className="text-xs uppercase font-bold tracking-widest text-white/80">Your Token Number</p>
                    <h2 className="text-5xl font-black tracking-tight my-1">{statusData.queue?.tokenNumber}</h2>
                    <p className="text-xs text-white/90 mt-1">
                      {statusData.queue?.status === 'CALLED'
                        ? 'Please proceed to the host desk to be seated!'
                        : 'Please wait in the lobby area.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/20 text-center">
                    <div className="p-2 bg-white/10 rounded-xl">
                      <span className="text-[10px] text-white/80 uppercase font-bold block">Position</span>
                      <span className="text-xl font-black">#{statusData.queue?.position || 1}</span>
                    </div>
                    <div className="p-2 bg-white/10 rounded-xl">
                      <span className="text-[10px] text-white/80 uppercase font-bold block">Est. Wait</span>
                      <span className="text-xl font-black">~{statusData.queue?.estimatedWaitMins || 10}m</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-stone-200 dark:border-zinc-800 text-center space-y-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    While you wait, you can build your cart so dishes can be prepared the moment you sit down.
                  </p>
                  <button 
                    onClick={() => setActiveTab('menu')} 
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold w-full rounded-xl h-10 active:scale-98 transition-all"
                  >
                    Pre-select Menu Items
                  </button>
                </div>
              </div>
            ) : (
              
              /* Join Queue Form */
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-stone-200 dark:border-zinc-800 shadow-md space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 mx-auto flex items-center justify-center mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Join the Waitlist</h2>
                  <p className="text-xs text-zinc-500">Secure your table in line instantly.</p>
                </div>

                <form onSubmit={handleJoinQueue} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">How many guests in your party?</label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 4, 6, 8].map(count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setGuestsCount(count)}
                          className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm border transition-all ${
                            guestsCount === count
                              ? 'bg-amber-500 border-amber-500 text-zinc-950 shadow-xs'
                              : 'bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Seating Preference (Optional)</label>
                    <input
                      placeholder="e.g. Indoor AC, Garden, Window"
                      value={queuePreference}
                      onChange={(e) => setQueuePreference(e.target.value)}
                      className="w-full h-10 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isJoiningQueue}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black h-12 rounded-2xl text-sm shadow-md flex items-center justify-center space-x-2 active:scale-98 transition-all"
                  >
                    {isJoiningQueue ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Get Waitlist Token</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE BILL & ACTIVE ORDERS */}
        {/* ========================================================================= */}
        {activeTab === 'bill' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <h2 className="font-extrabold text-base text-zinc-900 dark:text-white">Live Table Bill</h2>
                </div>
                {isSeated && (
                  <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                    Table {statusData.table!.tableNumber}
                    {statusData.table!.partyLabel && ` (Grp ${statusData.table!.partyLabel})`}
                  </span>
                )}
              </div>

              {isSeated && statusData.table?.items && statusData.table.items.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {statusData.table.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-stone-100 dark:border-zinc-800/60">
                        <div className="flex items-center space-x-2 truncate">
                          <span className="font-black text-amber-600">{item.quantity}x</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{item.name}</span>
                        </div>
                        <span className="font-bold font-serif text-zinc-900 dark:text-zinc-100 shrink-0 ml-2">
                          {currency}{(item.price * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-xs space-y-1.5">
                    <div className="flex justify-between text-zinc-500">
                      <span>Live Total</span>
                      <span className="font-bold font-serif text-sm text-zinc-900 dark:text-white">
                        {currency}{statusData.table.total.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => handleCallService('Bill & Payment', '💳')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold h-10 rounded-xl active:scale-98 transition-all text-xs"
                    >
                      Request Final Bill
                    </button>
                    <button 
                      onClick={() => setActiveTab('menu')}
                      className="flex-1 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 border border-stone-200 dark:border-zinc-700 text-zinc-900 dark:text-white h-10 rounded-xl font-bold text-xs"
                    >
                      Order More Dishes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400 space-y-2">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">No placed orders on this table yet.</p>
                  <button 
                    onClick={() => setActiveTab('menu')}
                    className="bg-amber-500 text-zinc-950 font-bold text-xs px-3.5 py-1.5 rounded-xl"
                  >
                    Open Menu
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: GUEST SERVICES & CALL WAITER */}
        {/* ========================================================================= */}
        {activeTab === 'service' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-stone-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-stone-100 dark:border-zinc-800">
                <Bell className="w-5 h-5 text-amber-500" />
                <h2 className="font-extrabold text-base text-zinc-900 dark:text-white">Staff & Table Services</h2>
              </div>

              <p className="text-xs text-zinc-500">
                Need anything at your table? Tap below and our floor staff will attend to you right away.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { name: 'Call Waiter', icon: '🛎️', lucide: Bell, color: 'text-amber-500', desc: 'Assistance at table' },
                  { name: 'Water Refill', icon: '💧', lucide: Droplets, color: 'text-blue-500', desc: 'Drinking water' },
                  { name: 'Extra Cutlery & Napkins', icon: '🍴', lucide: Utensils, color: 'text-emerald-500', desc: 'Spoons, forks & tissues' },
                  { name: 'Bill & Payment', icon: '💳', lucide: Receipt, color: 'text-purple-500', desc: 'UPI, Cash or Card' },
                ].map((srv) => {
                  const Icon = srv.lucide;
                  const isDone = serviceDispatchedType === srv.name;

                  return (
                    <button
                      key={srv.name}
                      onClick={() => handleCallService(srv.name, srv.icon)}
                      disabled={isSendingService}
                      className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all active:scale-95 ${
                        isDone
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200'
                          : 'bg-stone-50 dark:bg-zinc-800/60 border-stone-200 dark:border-zinc-700 hover:border-amber-400'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-1.5 ${isDone ? 'text-emerald-500' : srv.color}`} />
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{srv.name}</span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">{srv.desc}</span>
                      {isDone && <span className="text-[9px] font-black text-emerald-600 mt-1">Dispatched ✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Custom Request Note */}
              <div className="pt-3 border-t border-stone-100 dark:border-zinc-800 space-y-2">
                <label className="text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider block">
                  Custom Request Note
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customRequestText}
                    onChange={(e) => setCustomRequestText(e.target.value)}
                    placeholder="e.g. Extra napkins, baby chair..."
                    className="flex-1 h-10 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 px-3.5 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleSendCustomService}
                    disabled={!customRequestText.trim() || isSendingService}
                    className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs px-4 rounded-xl disabled:opacity-50 active:scale-95 transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. FLOATING CART PILL (WHEN ITEMS IN CART) ───────────── */}
      {cartItemsCount > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 animate-modal">
          <div className="bg-zinc-950 text-white rounded-2xl p-3.5 px-4 shadow-2xl border border-zinc-700 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="font-black text-xs">{cartItemsCount} {cartItemsCount === 1 ? 'Item' : 'Items'}</span>
                {isSeated && (
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                    Table {statusData.table!.tableNumber}
                  </span>
                )}
              </div>
              <p className="text-amber-400 font-serif font-black text-sm mt-0.5">
                {currency}{cartTotal.toFixed(0)}
              </p>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs px-4 h-9 rounded-xl shadow-md active:scale-95 transition-all flex items-center space-x-1"
            >
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. BOTTOM APP NAVIGATION BAR (NATIVE APP STYLE) ─────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-stone-200 dark:border-zinc-800 max-w-md mx-auto py-1 px-3 shadow-lg">
        <div className="flex items-center justify-around">
          
          {/* Tab: Menu */}
          <button
            onClick={() => {
              setActiveTab('menu');
              triggerHaptic(ImpactStyle.Light);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              activeTab === 'menu'
                ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
                : 'text-zinc-400 hover:text-zinc-600 font-medium'
            }`}
          >
            <Utensils className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Menu</span>
          </button>

          {/* Tab: Status */}
          <button
            onClick={() => {
              setActiveTab('status');
              triggerHaptic(ImpactStyle.Light);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative ${
              activeTab === 'status'
                ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
                : 'text-zinc-400 hover:text-zinc-600 font-medium'
            }`}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Waitlist</span>
            {isWaitingInQueue && (
              <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-3 animate-ping" />
            )}
          </button>

          {/* Tab: Live Tab / Bill */}
          <button
            onClick={() => {
              setActiveTab('bill');
              triggerHaptic(ImpactStyle.Light);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              activeTab === 'bill'
                ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
                : 'text-zinc-400 hover:text-zinc-600 font-medium'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">My Bill</span>
          </button>

          {/* Tab: Service */}
          <button
            onClick={() => {
              setActiveTab('service');
              triggerHaptic(ImpactStyle.Light);
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              activeTab === 'service'
                ? 'text-amber-600 dark:text-amber-400 font-bold scale-105'
                : 'text-zinc-400 hover:text-zinc-600 font-medium'
            }`}
          >
            <Bell className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Service</span>
          </button>
        </div>
      </div>

      {/* ─── 5. CART / CHECKOUT REVIEW MODAL ───────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-t sm:border border-stone-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-modal shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-zinc-900 dark:text-white">Review Your Order</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-stone-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              {isSeated ? (
                <span>Sending to <strong>Table {statusData.table!.tableNumber}</strong></span>
              ) : (
                <span>Dine-In Order for <strong>{customerName || 'Guest'}</strong></span>
              )}
            </p>

            {/* Cart Items */}
            <div className="py-2 space-y-2.5 max-h-56 overflow-y-auto">
              {cartEntries.map(({ item, quantity }) => (
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-zinc-800/60 rounded-xl border border-stone-200 dark:border-zinc-700 text-xs">
                  <div className="flex-1 pr-2 truncate">
                    <p className="font-bold text-zinc-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-amber-600 font-serif font-bold">{currency}{item.price.toFixed(0)}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-lg px-2 py-0.5">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-stone-600 hover:text-black">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold px-1 text-zinc-900 dark:text-white">{quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-stone-600 hover:text-black">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold font-serif min-w-[45px] text-right text-zinc-900 dark:text-white">
                      {currency}{(item.price * quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Special Request / Cooking Notes:</label>
              <input
                placeholder="e.g. Less spicy, serve hot, extra tissues"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full h-9 text-xs rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-stone-200 dark:border-zinc-700 px-3 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Bill Summary */}
            <div className="pt-2 border-t border-stone-200 dark:border-zinc-700 text-xs space-y-1">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>{currency}{cartSubtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Tax ({taxRate}%)</span>
                <span>{currency}{taxAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-white pt-1 border-t border-stone-200 dark:border-zinc-700">
                <span>Total</span>
                <span className="text-amber-600 font-serif">{currency}{cartTotal.toFixed(0)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsCartOpen(false)}
                className="flex-1 bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 text-zinc-900 dark:text-white font-bold h-11 rounded-xl text-xs"
              >
                Add More
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={isOrdering || cartItemsCount === 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black h-11 rounded-xl text-xs flex items-center justify-center space-x-1 active:scale-98 transition-all"
              >
                {isOrdering ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <>
                    <span>Send to Kitchen</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. ORDER RECEIVED SUCCESS POPUP ──────────────────────── */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-3xl p-6 text-center space-y-4 max-w-xs w-full shadow-2xl animate-modal">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-1">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white">Order Placed!</h3>
              <p className="text-xs text-zinc-500">
                Your dishes have been transmitted directly to the kitchen chefs. Enjoy your meal!
              </p>
            </div>
            <button
              onClick={() => {
                setOrderSuccessModal(false);
                setActiveTab('bill');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 rounded-xl text-xs"
            >
              Great!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
