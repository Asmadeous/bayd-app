import Foundation
import Capacitor
import CoreLocation

// Background-capable location for the staff app. @capacitor/geolocation drives a
// CLLocationManager it never sets allowsBackgroundLocationUpdates on, so its
// watch stops delivering the moment iOS suspends the app. A tech's shift
// tracking has to survive the screen locking, so this owns its own manager with
// that flag set. Staff only: the flag traps at runtime unless the target also
// declares UIBackgroundModes location, which the customer app deliberately does
// not.
@objc(BackgroundLocationPlugin)
public class BackgroundLocationPlugin: CAPPlugin, CLLocationManagerDelegate {

    private let manager = CLLocationManager()

    override public func load() {
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        // Roughly a city block. Matches the old watchPosition behaviour of
        // reporting on movement rather than on a timer, and keeps the radio down.
        manager.distanceFilter = 25
        // iOS otherwise pauses updates when it decides the user stopped moving,
        // and never resumes on its own, which silently ends a shift's tracking.
        manager.pausesLocationUpdatesAutomatically = false
        manager.activityType = .automotiveNavigation
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Always authorisation is what keeps fixes coming once suspended.
            // WhenInUse alone is enough for a foreground watch and nothing more.
            if self.manager.authorizationStatus == .notDetermined {
                self.manager.requestWhenInUseAuthorization()
            }
            self.manager.requestAlwaysAuthorization()

            self.manager.allowsBackgroundLocationUpdates = true
            self.manager.showsBackgroundLocationIndicator = true
            self.manager.startUpdatingLocation()
            call.resolve(["started": true])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.manager.stopUpdatingLocation()
            // Released so a tech going off shift is not tracked, and so iOS stops
            // showing the background location indicator.
            self.manager.allowsBackgroundLocationUpdates = false
            call.resolve()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        notifyListeners("location", data: [
            "latitude": location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "accuracy_meters": Int(location.horizontalAccuracy.rounded())
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Best effort: a transient CoreLocation failure must never break the
        // tech's app. The next fix simply arrives later.
    }
}
