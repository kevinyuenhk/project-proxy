#import <Capacitor/Capacitor.h>

// Objective-C macro for plugin registration.
// In a real Xcode project, this is handled by Capacitor's auto-registration.
// This stub is provided for reference; the Swift registration happens in the plugin class.

CAP_PLUGIN(BonsaiPlugin, "BonsaiPlugin",
    CAP_PLUGIN_METHOD(loadModel, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(generate, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopGeneration, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getModels, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getLoadedModel, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getPerformance, CAPPluginReturnPromise);
)
