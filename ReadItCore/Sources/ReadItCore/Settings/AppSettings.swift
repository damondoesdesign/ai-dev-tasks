import Foundation

public struct AppSettings: Codable, Equatable, Sendable {
    public var voiceID: String
    public var language: String
    public var speed: Double
    public var trigger: TriggerBinding
    public var launchAtLogin: Bool
    public var activeProfileName: String?

    public init(
        voiceID: String = BuiltInVoices.defaultVoiceID,
        language: String = "auto",
        speed: Double = SpeedRange.default,
        trigger: TriggerBinding = .defaultBinding,
        launchAtLogin: Bool = false,
        activeProfileName: String? = nil
    ) {
        self.voiceID = voiceID
        self.language = language
        self.speed = SpeedRange.clamp(speed)
        self.trigger = trigger
        self.launchAtLogin = launchAtLogin
        self.activeProfileName = activeProfileName
    }

    public static let `default` = AppSettings()

    public mutating func applyNormalized() {
        speed = SpeedRange.clamp(speed)
        if voiceID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            voiceID = BuiltInVoices.defaultVoiceID
        }
    }
}
