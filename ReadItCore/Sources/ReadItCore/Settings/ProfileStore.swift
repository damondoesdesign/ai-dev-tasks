import Foundation

public struct ProfileStore: Sendable {
    public var fileURL: URL
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(fileURL: URL) {
        self.fileURL = fileURL
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder
    }

    public static func defaultApplicationSupportURL(
        fileManager: FileManager = .default
    ) throws -> URL {
        let root = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let dir = root.appendingPathComponent("ReadIt", isDirectory: true)
        try fileManager.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("profiles.json")
    }

    public func load() throws -> [SettingsProfile] {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return []
        }
        let data = try Data(contentsOf: fileURL)
        let snapshot = try decoder.decode(ProfileStoreSnapshot.self, from: data)
        return snapshot.profiles.sorted {
            $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    public func save(_ profiles: [SettingsProfile]) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let data = try encoder.encode(ProfileStoreSnapshot(profiles: profiles))
        try data.write(to: fileURL, options: .atomic)
    }

    public func upsert(name: String, settings: AppSettings, into profiles: inout [SettingsProfile]) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        var copy = settings
        copy.applyNormalized()
        copy.activeProfileName = trimmed
        if let index = profiles.firstIndex(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            profiles[index].settings = copy
            profiles[index].name = trimmed
            profiles[index].updatedAt = Date()
        } else {
            profiles.append(SettingsProfile(name: trimmed, settings: copy))
        }
        profiles.sort { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    public func delete(id: UUID, from profiles: inout [SettingsProfile]) {
        profiles.removeAll { $0.id == id }
    }
}
