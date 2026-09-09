import Foundation

public struct SettingsProfile: Codable, Equatable, Identifiable, Sendable {
    public var id: UUID
    public var name: String
    public var settings: AppSettings
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        settings: AppSettings,
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.settings = settings
        self.updatedAt = updatedAt
    }
}

public struct ProfileStoreSnapshot: Codable, Equatable, Sendable {
    public var profiles: [SettingsProfile]

    public init(profiles: [SettingsProfile] = []) {
        self.profiles = profiles
    }
}
