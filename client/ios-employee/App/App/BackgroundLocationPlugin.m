#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift BackgroundLocationPlugin with the Capacitor bridge.
// Method names must match lib/native/background-location.ts.
CAP_PLUGIN(BackgroundLocationPlugin, "BackgroundLocation",
    CAP_PLUGIN_METHOD(start, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stop, CAPPluginReturnPromise);
)
