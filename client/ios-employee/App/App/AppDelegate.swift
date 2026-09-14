import UIKit
import Capacitor
import SquareMobilePaymentsSDK
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    // The SDK has no public "is initialized?" query, so we track it ourselves —
    // SquarePosPlugin.isReady() reads this to decide whether Tap to Pay can run.
    static var squareSdkInitialized = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Firebase powers push on iOS. Capacitor's push plugin hands back the raw
        // APNs token, but the backend (Fcm::Client) only speaks FCM - so we run
        // Firebase Messaging, feed it the APNs token, and forward the FCM token it
        // returns to Capacitor. Needs GoogleService-Info.plist in the target.
        FirebaseApp.configure()
        Messaging.messaging().delegate = self

        // Initialize the Square Mobile Payments SDK (Tap to Pay) once, at launch,
        // only when a Square application id is configured (SquareApplicationID in
        // Info.plist, set per build from SQUARE_APPLICATION_ID). Empty -> SDK is
        // not initialized -> SquarePosPlugin.isReady() is false -> the app falls
        // back to a payment link. See docs/square-tap-to-pay.md.
        if let appId = Bundle.main.object(forInfoDictionaryKey: "SquareApplicationID") as? String,
           !appId.isEmpty {
            MobilePaymentsSDK.initialize(squareApplicationID: appId)
            AppDelegate.squareSdkInitialized = true
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Hand the APNs token to Firebase; it exchanges it for an FCM token,
        // delivered via messaging(_:didReceiveRegistrationToken:) below.
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // Firebase returns the FCM token here (on first launch and on rotation). Post
    // it as the Capacitor "registration" token so the JS layer sends an FCM token
    // (not the APNs one) to POST /device_tokens, which the FCM backend can reach.
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: fcmToken)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
