import AppKit
import ReadItCore
import SwiftUI

struct SettingsView: View {
    @Bindable var appState: AppState
    @Environment(\.openWindow) private var openWindow
    @State private var profileName = ""
    @State private var isCapturingTrigger = false
    @State private var captureMonitor: Any?
    @State private var localError: String?

    var body: some View {
        ZStack {
            ReadItTheme.backgroundGradient.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    BrandMark(compact: true)

                    settingsCard("Voice") {
                        Picker("Grok voice", selection: $appState.settings.voiceID) {
                            ForEach(appState.voices) { voice in
                                Text(voice.name).tag(voice.voiceID)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: appState.settings.voiceID) { _, _ in
                            appState.persistSettings()
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Speed")
                                Spacer()
                                Text(String(format: "%.2f×", appState.settings.speed))
                                    .foregroundStyle(.secondary)
                                    .monospacedDigit()
                            }
                            Slider(
                                value: $appState.settings.speed,
                                in: SpeedRange.minimum...SpeedRange.maximum,
                                step: 0.05
                            )
                            .tint(ReadItTheme.spruce)
                            .onChange(of: appState.settings.speed) { _, _ in
                                appState.persistSettings()
                            }
                            Text("Grok TTS supports 0.7×–1.5×")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Picker("Language", selection: $appState.settings.language) {
                            Text("Auto detect").tag("auto")
                            Text("English").tag("en")
                            Text("Spanish").tag("es")
                            Text("French").tag("fr")
                            Text("German").tag("de")
                            Text("Japanese").tag("ja")
                            Text("Chinese").tag("zh")
                        }
                        .onChange(of: appState.settings.language) { _, _ in
                            appState.persistSettings()
                        }
                    }

                    settingsCard("Trigger") {
                        Text(appState.settings.trigger.displayName)
                            .font(.system(.title3, design: .rounded).weight(.semibold))
                            .foregroundStyle(ReadItTheme.ink)

                        Text("Default is Shift + Middle Click. Capture a new combo below.")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        HStack {
                            Button(isCapturingTrigger ? "Listening…" : "Capture new trigger") {
                                beginCapture()
                            }
                            .buttonStyle(ReadItPrimaryButtonStyle())
                            .disabled(isCapturingTrigger)

                            Button("Reset to Shift + Middle Click") {
                                appState.settings.trigger = .defaultBinding
                                appState.persistSettings()
                            }
                            .buttonStyle(.bordered)
                        }

                        Toggle("Launch at login", isOn: $appState.settings.launchAtLogin)
                            .onChange(of: appState.settings.launchAtLogin) { _, _ in
                                appState.persistSettings()
                            }

                        if !SelectionReader.isTrusted {
                            Button("Grant Accessibility permission") {
                                _ = SelectionReader.promptForAccessibilityIfNeeded()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(ReadItTheme.amber)
                        }
                    }

                    settingsCard("API key") {
                        if appState.needsOnboarding {
                            Text("No API key stored yet.")
                                .foregroundStyle(.secondary)
                        } else {
                            Text("API key is stored in Keychain.")
                                .foregroundStyle(ReadItTheme.spruce)
                        }
                        HStack {
                            Button("Open setup…") {
                                appState.showOnboarding = true
                                openWindow(id: "onboarding")
                                NSApp.activate(ignoringOtherApps: true)
                            }
                            Button("Remove key", role: .destructive) {
                                appState.clearAPIKey()
                            }
                        }
                    }

                    settingsCard("Profiles") {
                        Text("Save voice, speed, language, and trigger as a named profile. API keys are never included.")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        HStack {
                            TextField("Profile name", text: $profileName)
                                .textFieldStyle(.roundedBorder)
                            Button("Save") {
                                appState.saveProfile(named: profileName)
                                profileName = ""
                            }
                            .disabled(profileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        }

                        if appState.profiles.isEmpty {
                            Text("No saved profiles yet.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(appState.profiles) { profile in
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(profile.name)
                                            .font(.headline)
                                        Text("\(profile.settings.voiceID) · \(String(format: "%.2f×", profile.settings.speed)) · \(profile.settings.trigger.displayName)")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Button("Load") {
                                        appState.loadProfile(profile)
                                    }
                                    Button("Delete", role: .destructive) {
                                        appState.deleteProfile(profile)
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }

                    if let localError {
                        Text(localError)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }

                    settingsCard("Help") {
                        Link("Text to Speech docs", destination: OnboardingLinks.ttsDocs)
                        Link("Voice overview", destination: OnboardingLinks.voiceOverview)
                        Text("Right-click path: highlight text → Services → Read It. If missing, enable it in System Settings → Keyboard → Keyboard Shortcuts → Services.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(28)
            }
        }
        .onDisappear {
            endCapture()
        }
    }

    @ViewBuilder
    private func settingsCard<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.system(.title3, design: .serif).weight(.semibold))
                .foregroundStyle(ReadItTheme.ink)
            content()
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.white.opacity(0.72))
                .shadow(color: ReadItTheme.softShadow, radius: 16, y: 6)
        )
    }

    private func beginCapture() {
        endCapture()
        isCapturingTrigger = true
        localError = nil
        captureMonitor = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .otherMouseDown, .leftMouseDown, .rightMouseDown]) { event in
            var binding = TriggerBinding(
                requireShift: event.modifierFlags.contains(.shift),
                requireControl: event.modifierFlags.contains(.control),
                requireOption: event.modifierFlags.contains(.option),
                requireCommand: event.modifierFlags.contains(.command),
                keyCode: nil,
                mouseButton: nil
            )
            switch event.type {
            case .keyDown:
                binding.keyCode = UInt16(event.keyCode)
            case .leftMouseDown:
                binding.mouseButton = 0
            case .rightMouseDown:
                binding.mouseButton = 1
            case .otherMouseDown:
                binding.mouseButton = Int(event.buttonNumber)
            default:
                break
            }
            // Ignore unmodified plain clicks to avoid accidental capture.
            let hasModifier = binding.requireShift || binding.requireControl || binding.requireOption || binding.requireCommand
            guard hasModifier || binding.keyCode != nil else { return event }

            Task { @MainActor in
                appState.settings.trigger = binding
                appState.persistSettings()
                isCapturingTrigger = false
                endCapture()
            }
            return nil
        }
    }

    private func endCapture() {
        if let captureMonitor {
            NSEvent.removeMonitor(captureMonitor)
        }
        captureMonitor = nil
        isCapturingTrigger = false
    }
}
