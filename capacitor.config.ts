import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the static PWA (public/app.html) in a native iOS/Android shell.
// webDir points at public/ because that's where the live app + manifest + sw + icons live.
// The native webview loads public/index.html, which immediately redirects to app.html.
const config: CapacitorConfig = {
  appId: 'com.ifrodo.fitbitair',
  appName: 'Fitbit Air',
  webDir: 'public',
  server: {
    // Use https scheme on Android so the service worker + secure-context APIs work
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#020810',
      showSpinner: false,
    },
  },
};

export default config;
