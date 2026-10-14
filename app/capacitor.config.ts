import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'za.co.superimmersive.nsnp',
  appName: 'NSNP Learning',
  webDir: 'dist',
  backgroundColor: '#0b2545',
  android: {
    backgroundColor: '#0b2545',
  },
  ios: {
    backgroundColor: '#0b2545',
    contentInset: 'automatic',
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0b2545',
      androidScaleType: 'CENTER',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b2545',
      overlaysWebView: false,
    },
  },
}

export default config
