# iOS App Setup for Project Proxy

This directory contains the Capacitor iOS app files.
Run `npx cap add ios` from the project root to generate the full Xcode project.

## Manual Steps After `cap add ios`

1. In Xcode, add BonsaiEngine as a local package:
   - File → Add Package Dependencies → Add Local...
   - Select the `BonsaiEngine/` directory

2. Add `BonsaiPlugin.swift` to the app target

3. Register the plugin. In your `AppDelegate.swift`:
   ```swift
   import Capacitor

   func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
       // Auto-registration works if BonsaiPlugin uses @objc macros
       return true
   }
   ```

4. Build and run on a connected iOS device (simulator won't have Apple Neural Engine).
