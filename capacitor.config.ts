import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.prismml.projectproxy',
  appName: 'Project Proxy',
  webDir: 'dist',
  ios: {
    scheme: 'ProjectProxy',
  },
  plugins: {
    BonsaiPlugin: {},
  },
}

export default config
