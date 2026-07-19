import Foundation

public struct TTSRequest: Codable, Equatable, Sendable {
    public var text: String
    public var voiceID: String
    public var language: String
    public var speed: Double

    public init(
        text: String,
        voiceID: String = BuiltInVoices.defaultVoiceID,
        language: String = "auto",
        speed: Double = 1.0
    ) {
        self.text = text
        self.voiceID = voiceID
        self.language = language
        self.speed = SpeedRange.clamp(speed)
    }

    enum CodingKeys: String, CodingKey {
        case text
        case voiceID = "voice_id"
        case language
        case speed
    }
}

public enum SpeedRange {
    public static let minimum = 0.7
    public static let maximum = 1.5
    public static let `default` = 1.0

    public static func clamp(_ value: Double) -> Double {
        min(max(value, minimum), maximum)
    }
}

public struct VoicesResponse: Codable, Equatable, Sendable {
    public let voices: [VoiceInfo]
}
