import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.restaurantos.customer',
  appName: 'Restaurant Customer',
  webDir: 'dist',
  server: {
    // Allows loading remote or local dev backend with cleartext HTTP for local dev
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#09090b',
      overlaysWebView: false
    }
  }
};

export default config;
