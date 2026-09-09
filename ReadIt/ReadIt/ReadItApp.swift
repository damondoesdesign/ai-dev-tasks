import SwiftUI

@main
struct ReadItApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        MenuBarExtra {
            MenuBarExtraContent(appState: appState)
        } label: {
            Label("Read It", systemImage: appState.menuBarSymbolName)
        }
        .menuBarExtraStyle(.menu)

        Window("Welcome to Read It", id: "onboarding") {
            OnboardingView(appState: appState)
                .frame(width: 560, height: 640)
        }
        .windowResizability(.contentSize)
        .windowStyle(.hiddenTitleBar)

        Window("Read It Settings", id: "settings-window") {
            SettingsView(appState: appState)
                .frame(minWidth: 520, minHeight: 560)
        }
        .windowResizability(.contentSize)

        Settings {
            SettingsView(appState: appState)
                .frame(minWidth: 520, minHeight: 560)
        }
    }
}
