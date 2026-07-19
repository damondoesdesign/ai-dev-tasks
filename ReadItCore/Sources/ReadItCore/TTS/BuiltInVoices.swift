import Foundation

public struct VoiceInfo: Codable, Equatable, Identifiable, Sendable, Hashable {
    public var id: String { voiceID }
    public let voiceID: String
    public let name: String
    public let language: String?

    public init(voiceID: String, name: String, language: String? = "en") {
        self.voiceID = voiceID
        self.name = name
        self.language = language
    }

    enum CodingKeys: String, CodingKey {
        case voiceID = "voice_id"
        case name
        case language
    }
}

public enum BuiltInVoices {
    public static let fallback: [VoiceInfo] = [
        VoiceInfo(voiceID: "ara", name: "Ara"),
        VoiceInfo(voiceID: "eve", name: "Eve"),
        VoiceInfo(voiceID: "leo", name: "Leo"),
        VoiceInfo(voiceID: "rex", name: "Rex"),
        VoiceInfo(voiceID: "sal", name: "Sal")
    ]

    public static let defaultVoiceID = "eve"
}
