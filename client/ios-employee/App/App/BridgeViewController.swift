import UIKit
import Capacitor

// Registers this app's OWN plugins with the Capacitor bridge.
//
// Capacitor only instantiates plugins named in capacitor.config.json's
// packageClassList (CapacitorBridge.registerPlugins), and `cap sync` rebuilds
// that list from node_modules alone, so a plugin whose source lives in this
// target is never in it. Compiling the class and declaring CAP_PLUGIN is not
// enough: without this the bridge has no SquarePos, every JS call rejects with
// "not implemented", and useTapToPay silently falls back to the payment link.
class BridgeViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        // registerPluginInstance, NOT registerPluginType: the latter begins with
        // `if autoRegisterPlugins { return }`, and autoRegisterPlugins is on by
        // default, so it silently does nothing. registerPluginInstance has no
        // such guard and adds the plugin to the bridge's table directly.
        bridge?.registerPluginInstance(SquarePosPlugin())
        bridge?.registerPluginInstance(BackgroundLocationPlugin())
    }
}
