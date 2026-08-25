import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.restaurantos.app',
  appName: 'Restaurant OS',
  webDir: 'public',
  server: {
    url: 'https://restaurant-os-bay.vercel.app',
    cleartext: true,
    allowNavigation: [
      'https://restaurant-os-bay.vercel.app*',
      'restaurant-os-bay.vercel.app*',
      'localhost:3000*'
    ]
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
