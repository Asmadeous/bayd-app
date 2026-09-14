fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android internal

```sh
[bundle exec] fastlane android internal
```

Build + upload the app to Play internal testing (app:customer|staff)

### android production

```sh
[bundle exec] fastlane android production
```

Build + upload the app to Play production (app:customer|staff)

----


## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build + upload the app to TestFlight (app:customer|staff)

### ios release

```sh
[bundle exec] fastlane ios release
```

Build + upload the app to App Store review (app:customer|staff)

### ios certs

```sh
[bundle exec] fastlane ios certs
```

Seed the match repo with signing certs + profiles for both apps (run once)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
