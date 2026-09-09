import AppKit
import SwiftUI

struct MenuBarExtraContent: View {
    @Bindable var appState: AppState
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        Group {
            Button("Read Selection") {
                appState.readCurrentSelection()
            }
            Button("Stop") {
                appState.stopSpeaking()
            }
            .disabled({
                if case .speaking = appState.status { return false }
                if case .loading = appState.status { return false }
                return true
            }())

            Divider()

            Button("Settings…") {
                appState.showSettings = true
                openWindow(id: "settings-window")
                NSApp.activate(ignoringOtherApps: true)
            }
            Button(appState.needsOnboarding ? "Set Up API Key…" : "API Key Setup…") {
                appState.showOnboarding = true
                openWindow(id: "onboarding")
                NSApp.activate(ignoringOtherApps: true)
            }

            if case .error(let message) = appState.status {
                Divider()
                Text(message)
                    .foregroundStyle(.secondary)
            }

            Divider()
            Button("Quit Read It") {
                NSApp.terminate(nil)
            }
        }
        .onAppear {
            appState.start()
            if appState.showOnboarding {
                openWindow(id: "onboarding")
            }
        }
        .onChange(of: appState.showOnboarding) { _, show in
            if show {
                openWindow(id: "onboarding")
                NSApp.activate(ignoringOtherApps: true)
            }
        }
        .onChange(of: appState.showSettings) { _, show in
            if show {
                openWindow(id: "settings-window")
                NSApp.activate(ignoringOtherApps: true)
            }
        }
    }
}
