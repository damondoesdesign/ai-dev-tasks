import Foundation

public enum TextLimits {
    public static let maxCharacters = 15_000

    /// Returns trimmed text ready for TTS, or throws if empty / too long.
    public static func prepareForSpeech(_ text: String) throws -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw ReadItError.emptySelection
        }
        guard trimmed.count <= maxCharacters else {
            throw ReadItError.textTooLong(count: trimmed.count, limit: maxCharacters)
        }
        return trimmed
    }
}

public enum ReadItError: Error, Equatable, LocalizedError, Sendable {
    case emptySelection
    case textTooLong(count: Int, limit: Int)
    case missingAPIKey
    case invalidAPIKey
    case needsCredits
    case httpStatus(Int, String)
    case decodingFailed
    case playbackFailed(String)

    public var errorDescription: String? {
        switch self {
        case .emptySelection:
            return "No text is selected."
        case .textTooLong(let count, let limit):
            return "Selection is \(count) characters; the limit is \(limit)."
        case .missingAPIKey:
            return "Add your xAI API key in Settings."
        case .invalidAPIKey:
            return "That API key was rejected. Check it in Settings."
        case .needsCredits:
            return "Your xAI account needs credits. In console.x.ai, click Add credits, then try Validate & Save again."
        case .httpStatus(let code, let body):
            return "Speech request failed (\(code)): \(body)"
        case .decodingFailed:
            return "Could not read the server response."
        case .playbackFailed(let message):
            return "Could not play audio: \(message)"
        }
    }
}
