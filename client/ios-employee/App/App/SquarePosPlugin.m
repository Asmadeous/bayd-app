#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the Swift SquarePosPlugin with the Capacitor bridge and exposes its
// methods to JavaScript. Method names must match lib/native/square-pos.ts.
CAP_PLUGIN(SquarePosPlugin, "SquarePos",
    CAP_PLUGIN_METHOD(isReady, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(authorize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(chargeTapToPay, CAPPluginReturnPromise);
)
