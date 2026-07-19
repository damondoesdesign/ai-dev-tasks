import XCTest
import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import ReadItCore

final class ReadItCoreTests: XCTestCase {
    func testPrepareForSpeechTrimsAndAccepts() throws {
        let text = try TextLimits.prepareForSpeech("  Hello world  ")
        XCTAssertEqual(text, "Hello world")
    }

    func testPrepareForSpeechRejectsEmpty() {
        XCTAssertThrowsError(try TextLimits.prepareForSpeech("   \n")) { error in
            XCTAssertEqual(error as? ReadItError, .emptySelection)
        }
    }

    func testPrepareForSpeechRejectsTooLong() {
        let long = String(repeating: "a", count: TextLimits.maxCharacters + 1)
        XCTAssertThrowsError(try TextLimits.prepareForSpeech(long)) { error in
            guard case .textTooLong(let count, let limit)? = error as? ReadItError else {
                return XCTFail("Unexpected error \(error)")
            }
            XCTAssertEqual(count, TextLimits.maxCharacters + 1)
            XCTAssertEqual(limit, TextLimits.maxCharacters)
        }
    }

    func testSpeedClamp() {
        XCTAssertEqual(SpeedRange.clamp(0.1), 0.7)
        XCTAssertEqual(SpeedRange.clamp(2.0), 1.5)
        XCTAssertEqual(SpeedRange.clamp(1.1), 1.1)
    }

    func testTTSRequestEncodesExpectedKeys() throws {
        let request = TTSRequest(text: "Hi", voiceID: "ara", language: "en", speed: 1.2)
        let data = try JSONEncoder().encode(request)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertEqual(json["text"] as? String, "Hi")
        XCTAssertEqual(json["voice_id"] as? String, "ara")
        XCTAssertEqual(json["language"] as? String, "en")
        XCTAssertEqual(json["speed"] as? Double, 1.2)
    }

    func testDefaultTriggerDisplayName() {
        XCTAssertEqual(TriggerBinding.defaultBinding.displayName, "Shift + Middle Click")
    }

    func testProfileUpsertAndDelete() throws {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("readit-profiles-\(UUID().uuidString).json")
        defer { try? FileManager.default.removeItem(at: url) }

        let store = ProfileStore(fileURL: url)
        var profiles: [SettingsProfile] = []
        var settings = AppSettings(voiceID: "rex", speed: 1.3)
        store.upsert(name: " Fast Rex ", settings: settings, into: &profiles)
        XCTAssertEqual(profiles.count, 1)
        XCTAssertEqual(profiles[0].name, "Fast Rex")
        XCTAssertEqual(profiles[0].settings.voiceID, "rex")

        settings.voiceID = "sal"
        store.upsert(name: "fast rex", settings: settings, into: &profiles)
        XCTAssertEqual(profiles.count, 1)
        XCTAssertEqual(profiles[0].settings.voiceID, "sal")

        try store.save(profiles)
        let loaded = try store.load()
        XCTAssertEqual(loaded.count, 1)

        store.delete(id: loaded[0].id, from: &profiles)
        XCTAssertTrue(profiles.isEmpty)
    }

    func testTTSClientBuildsSpeechRequest() async throws {
        let session = MockSession { request in
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.url?.absoluteString, "https://api.x.ai/v1/tts")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-key")
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "audio/mpeg"]
            )!
            return (Data([1, 2, 3]), response)
        }
        let client = TTSClient(session: session)
        let audio = try await client.synthesize(
            request: TTSRequest(text: "Hello"),
            apiKey: "test-key"
        )
        XCTAssertEqual(audio, Data([1, 2, 3]))
    }

    func testTTSClientMapsUnauthorized() async {
        let session = MockSession { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 401,
                httpVersion: nil,
                headerFields: nil
            )!
            return (Data("nope".utf8), response)
        }
        let client = TTSClient(session: session)
        do {
            _ = try await client.listVoices(apiKey: "bad")
            XCTFail("Expected error")
        } catch {
            XCTAssertEqual(error as? ReadItError, .invalidAPIKey)
        }
    }
}

private struct MockSession: HTTPSessioning, @unchecked Sendable {
    let handler: @Sendable (URLRequest) throws -> (Data, URLResponse)

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try handler(request)
    }
}
