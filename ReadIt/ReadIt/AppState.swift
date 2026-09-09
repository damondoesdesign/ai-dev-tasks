import AppKit
import Observation
import ReadItCore
import ServiceManagement
import SwiftUI

enum SpeakStatus: Equatable {
    case idle
    case loading
    case speaking
    case error(String)
}

@MainActor
@Observable
final class AppState {
    var settings: AppSettings
    var profiles: [SettingsProfile] = []
    var voices: [VoiceInfo] = BuiltInVoices.fallback
    var status: SpeakStatus = .idle
    var needsOnboarding: Bool
    var showSettings = false
    var showOnboarding = false
    var statusMessage: String?

    private let settingsStore: SettingsPersistence
    private let profileStore: ProfileStore
    private let tts = TTSClient()
    private let player = SpeechPlayer()
    private let triggerMonitor: GlobalTriggerMonitor
    private var speakTask: Task<Void, Never>?
    private var didStart = false

    init() {
        let settingsURL = (try? SettingsPersistence.defaultURL())
            ?? FileManager.default.temporaryDirectory.appendingPathComponent("readit-settings.json")
        let profilesURL = (try? ProfileStore.defaultApplicationSupportURL())
            ?? FileManager.default.temporaryDirectory.appendingPathComponent("readit-profiles.json")
        let store = SettingsPersistence(fileURL: settingsURL)
        let profilesPersistence = ProfileStore(fileURL: profilesURL)
        let loadedSettings = (try? store.load()) ?? .default
        let loadedProfiles = (try? profilesPersistence.load()) ?? []
        let onboardingNeeded = KeychainStore.loadAPIKey() == nil

        settingsStore = store
        profileStore = profilesPersistence
        settings = loadedSettings
        profiles = loadedProfiles
        needsOnboarding = onboardingNeeded
        showOnboarding = onboardingNeeded
        triggerMonitor = GlobalTriggerMonitor(binding: loadedSettings.trigger)
    }

    func start() {
        guard !didStart else { return }
        didStart = true
        NSApp.setActivationPolicy(.accessory)
        ReadItServicesProvider.shared.appState = self
        NSApp.servicesProvider = ReadItServicesProvider.shared
        NSUpdateDynamicServices()

        player.onFinished = { [weak self] in
            self?.status = .idle
        }
        triggerMonitor.onTrigger = { [weak self] in
            self?.readCurrentSelection()
        }
        triggerMonitor.update(binding: settings.trigger)
        triggerMonitor.start()

        if !needsOnboarding {
            Task { await refreshVoices() }
        }
    }

    func openSettings() {
        showSettings = true
        NSApp.activate(ignoringOtherApps: true)
    }

    func openOnboarding() {
        showOnboarding = true
        NSApp.activate(ignoringOtherApps: true)
    }

    func persistSettings() {
        settings.applyNormalized()
        try? settingsStore.save(settings)
        triggerMonitor.update(binding: settings.trigger)
        applyLaunchAtLogin()
    }

    func applyLaunchAtLogin() {
        do {
            if settings.launchAtLogin {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
        } catch {
            // Launch-at-login may fail before the app is installed in /Applications.
        }
    }

    func saveAPIKey(_ key: String) async throws {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw ReadItError.missingAPIKey }
        try await tts.validateAPIKey(trimmed)
        try KeychainStore.saveAPIKey(trimmed)
        needsOnboarding = false
        showOnboarding = false
        await refreshVoices()
        statusMessage = "API key saved."
    }

    func clearAPIKey() {
        KeychainStore.deleteAPIKey()
        needsOnboarding = true
        voices = BuiltInVoices.fallback
    }

    func refreshVoices() async {
        guard let key = KeychainStore.loadAPIKey() else {
            voices = BuiltInVoices.fallback
            return
        }
        do {
            voices = try await tts.listVoices(apiKey: key)
        } catch {
            voices = BuiltInVoices.fallback
        }
    }

    func readCurrentSelection() {
        if needsOnboarding {
            openOnboarding()
            return
        }
        if !SelectionReader.isTrusted {
            _ = SelectionReader.promptForAccessibilityIfNeeded()
        }
        guard let text = SelectionReader.currentSelection() else {
            status = .error(ReadItError.emptySelection.localizedDescription)
            return
        }
        speak(text: text)
    }

    func speak(text: String) {
        speakTask?.cancel()
        player.stop()
        speakTask = Task { [weak self] in
            guard let self else { return }
            do {
                let prepared = try TextLimits.prepareForSpeech(text)
                guard let key = KeychainStore.loadAPIKey() else {
                    self.needsOnboarding = true
                    self.openOnboarding()
                    throw ReadItError.missingAPIKey
                }
                self.status = .loading
                let request = TTSRequest(
                    text: prepared,
                    voiceID: self.settings.voiceID,
                    language: self.settings.language,
                    speed: self.settings.speed
                )
                let audio = try await self.tts.synthesize(request: request, apiKey: key)
                try Task.checkCancellation()
                try self.player.play(mp3Data: audio)
                self.status = .speaking
            } catch is CancellationError {
                self.status = .idle
            } catch {
                self.status = .error(error.localizedDescription)
            }
        }
    }

    func stopSpeaking() {
        speakTask?.cancel()
        speakTask = nil
        player.stop()
        status = .idle
    }

    func saveProfile(named name: String) {
        profileStore.upsert(name: name, settings: settings, into: &profiles)
        settings.activeProfileName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        try? profileStore.save(profiles)
        persistSettings()
    }

    func loadProfile(_ profile: SettingsProfile) {
        settings = profile.settings
        settings.activeProfileName = profile.name
        persistSettings()
    }

    func deleteProfile(_ profile: SettingsProfile) {
        profileStore.delete(id: profile.id, from: &profiles)
        try? profileStore.save(profiles)
        if settings.activeProfileName == profile.name {
            settings.activeProfileName = nil
            persistSettings()
        }
    }

    var menuBarSymbolName: String {
        switch status {
        case .idle:
            return "text.book.closed.fill"
        case .loading:
            return "ellipsis.bubble.fill"
        case .speaking:
            return "speaker.wave.2.fill"
        case .error:
            return "exclamationmark.bubble.fill"
        }
    }
}
