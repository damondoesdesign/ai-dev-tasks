import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public protocol HTTPSessioning: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

#if canImport(FoundationNetworking)
/// Linux FoundationNetworking URLSession lacks the async `data(for:)` API used on Apple platforms.
public struct URLSessionHTTPTransport: HTTPSessioning, @unchecked Sendable {
    public init() {}

    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await withCheckedThrowingContinuation { continuation in
            let task = URLSession.shared.dataTask(with: request) { data, response, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                guard let data, let response else {
                    continuation.resume(throwing: URLError(.badServerResponse))
                    return
                }
                continuation.resume(returning: (data, response))
            }
            task.resume()
        }
    }
}
#else
extension URLSession: HTTPSessioning {}
#endif

public struct TTSClient: Sendable {
    public var baseURL: URL
    public var session: any HTTPSessioning

    public init(
        baseURL: URL = URL(string: "https://api.x.ai/v1")!,
        session: (any HTTPSessioning)? = nil
    ) {
        self.baseURL = baseURL
        #if canImport(FoundationNetworking)
        self.session = session ?? URLSessionHTTPTransport()
        #else
        self.session = session ?? URLSession.shared
        #endif
    }

    public func synthesize(request body: TTSRequest, apiKey: String) async throws -> Data {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { throw ReadItError.missingAPIKey }

        var urlRequest = URLRequest(url: baseURL.appendingPathComponent("tts"))
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: urlRequest)
        try Self.throwIfNeeded(data: data, response: response)
        return data
    }

    public func listVoices(apiKey: String) async throws -> [VoiceInfo] {
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { throw ReadItError.missingAPIKey }

        var urlRequest = URLRequest(url: baseURL.appendingPathComponent("tts/voices"))
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: urlRequest)
        try Self.throwIfNeeded(data: data, response: response)
        do {
            let decoded = try JSONDecoder().decode(VoicesResponse.self, from: data)
            return decoded.voices.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        } catch {
            throw ReadItError.decodingFailed
        }
    }

    /// Lightweight check: list voices and ensure the key is accepted.
    public func validateAPIKey(_ apiKey: String) async throws {
        _ = try await listVoices(apiKey: apiKey)
    }

    private static func throwIfNeeded(data: Data, response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard !(200...299).contains(http.statusCode) else { return }
        let body = String(data: data, encoding: .utf8) ?? ""
        let lowered = body.lowercased()
        let looksLikeBilling =
            http.statusCode == 402
            || lowered.contains("credit")
            || lowered.contains("billing")
            || lowered.contains("payment")
            || lowered.contains("insufficient")
            || lowered.contains("balance")
        if looksLikeBilling {
            throw ReadItError.needsCredits
        }
        if http.statusCode == 401 {
            throw ReadItError.invalidAPIKey
        }
        // 403 is often "key ok but account can't use this yet" (credits / permissions).
        if http.statusCode == 403 {
            throw ReadItError.needsCredits
        }
        throw ReadItError.httpStatus(http.statusCode, String(body.prefix(240)))
    }
}
