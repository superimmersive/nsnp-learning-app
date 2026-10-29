import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Native shell for the NSNP learning app.
 * Version 1.0.0 lives in the Android and iOS projects, not here.
 * The next store upload is Android versionCode 2 and iOS build 3.
 * Do not put keystore passwords, API keys, or signing identifiers in this file.
 */
const config: CapacitorConfig = {
  appId: 'za.co.superimmersive.nsnp',
  appName: 'NSNP Learning',
  webDir: 'dist',
  backgroundColor: '#0b2545',
  ios: {
    backgroundColor: '#0b2545',
    // Safe areas are applied in CSS (`env(safe-area-inset-*)`).
    contentInset: 'never',
  },
  android: {
    backgroundColor: '#0b2545',
  },
  server: {
    androidScheme: 'https',
    hostname: 'localhost',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#0b2545',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
