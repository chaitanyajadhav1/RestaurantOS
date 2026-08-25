import { useState, useEffect, useCallback } from 'react';
import { ConnectModal } from './components/ConnectModal';
import { CustomerAppView } from './components/CustomerAppView';
import { api, type RestaurantInfo, type MenuCategory } from './services/api';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [config, setConfig] = useState<{
    slug: string;
    name: string;
    phone: string;
  } | null>(() => {
    const saved = localStorage.getItem('CUSTOMER_APP_SESSION');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRestaurantData(slug);
      setRestaurant(data.restaurant);
      setCategories(data.categories);
    } catch (err: any) {
      console.error('Menu load error:', err);
      setError(err.message || 'Failed to load restaurant menu. Check server URL and network connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config?.slug) {
      fetchMenu(config.slug);
    }
  }, [config?.slug, fetchMenu]);

  const handleConnect = (newConfig: { slug: string; name: string; phone: string }) => {
    localStorage.setItem('CUSTOMER_APP_SESSION', JSON.stringify(newConfig));
    setConfig(newConfig);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('CUSTOMER_APP_SESSION');
    setConfig(null);
    setRestaurant(null);
    setCategories([]);
  };

  if (!config) {
    return <ConnectModal onConnect={handleConnect} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <h3 className="font-black text-lg text-zinc-900 dark:text-white">Loading Restaurant Menu</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Connecting to {config.slug.toUpperCase()}...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-lg text-zinc-900 dark:text-white">Connection Error</h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">{error}</p>
        </div>
        <div className="flex flex-col space-y-2 w-full pt-2">
          <button
            onClick={() => fetchMenu(config.slug)}
            className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold h-11 rounded-2xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-98 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <button
            onClick={handleDisconnect}
            className="w-full bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-bold h-11 rounded-2xl text-xs active:scale-98 transition-all"
          >
            Change Restaurant Code / Server
          </button>
        </div>
      </div>
    );
  }

  return (
    <CustomerAppView
      restaurant={restaurant}
      categories={categories}
      customerName={config.name}
      customerPhone={config.phone}
      currency={restaurant.currency || '₹'}
      onDisconnect={handleDisconnect}
      onRefreshMenu={() => fetchMenu(config.slug)}
    />
  );
}

export default App;
