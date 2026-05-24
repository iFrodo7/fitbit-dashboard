import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the static PWA (public/app.html) in a native iOS/Android shell.
// webDir points at public/ because that's where the live app + manifest + sw + icons live.
// The native webview loads public/index.html, which immediately redirects to app.html.
const config: CapacitorConfig = {
  appId: 'com.ifrodo.aira',
  appName: 'AIRA',
  webDir: 'public',
  // The native webview is a secure context; the service worker + crypto APIs work.
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#020810',
    // Allow only our own origin to be treated as app-bound (security best practice).
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: '#020810',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
