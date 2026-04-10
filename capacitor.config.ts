import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.projectproxy.app',
  appName: 'Project Proxy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    BonsaiPlugin: {},
  },
};

export default config;
