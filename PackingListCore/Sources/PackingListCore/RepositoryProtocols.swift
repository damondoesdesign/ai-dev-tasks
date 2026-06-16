import Foundation

public struct LibraryItemDraft: Sendable {
    public var name: String
    public var category: String
    public var defaultBagType: BagType?
    public var defaultPackingStyle: PackingStyle?
    public var colorTagID: UUID?
    public var notes: String?

    public init(
        name: String,
        category: String,
        defaultBagType: BagType? = nil,
        defaultPackingStyle: PackingStyle? = nil,
        colorTagID: UUID? = nil,
        notes: String? = nil
    ) {
        self.name = name
        self.category = category
        self.defaultBagType = defaultBagType
        self.defaultPackingStyle = defaultPackingStyle
        self.colorTagID = colorTagID
        self.notes = notes
    }
}

public struct ColorTagDraft: Sendable {
    public var name: String
    public var colorIndex: Int

    public init(name: String, colorIndex: Int) {
        self.name = name
        self.colorIndex = colorIndex
    }
}

public struct SyncRecordMetadata: Sendable {
    public var createdAt: Date
    public var updatedAt: Date
    public var version: Int

    public init(createdAt: Date = .now, updatedAt: Date = .now, version: Int = 1) {
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.version = version
    }

    public mutating func bump() {
        updatedAt = .now
        version += 1
    }
}

// MARK: - Repository protocols (v2-ready boundary)

public protocol TripRepository: Sendable {
    func fetchTrips() throws -> [TripSnapshot]
    func createTrip(name: String, bagTypes: [BagType]) throws -> TripSnapshot
    func duplicateTrip(sourceID: UUID, newName: String) throws -> TripSnapshot
    func renameTrip(id: UUID, name: String) throws
    func deleteTrip(id: UUID) throws
    func updateBagNickname(tripBagID: UUID, nickname: String?) throws
    func reorderBags(tripID: UUID, bagIDsInOrder: [UUID]) throws
    func addPackedItem(from libraryItem: LibraryItemDraft, libraryItemID: UUID, to tripBagID: UUID) throws
    func togglePacked(itemID: UUID) throws
    func removePackedItem(id: UUID) throws
    func movePackedItem(id: UUID, to tripBagID: UUID) throws
    func reorderPackedItems(in tripBagID: UUID, itemIDsInOrder: [UUID]) throws
    func updatePackedItem(id: UUID, draft: LibraryItemDraft) throws
}

public protocol LibraryRepository: Sendable {
    func fetchItems(search: String?, category: String?, colorTagID: UUID?) throws -> [LibraryItemDraft]
    func createItem(_ draft: LibraryItemDraft) throws -> UUID
    func updateItem(id: UUID, draft: LibraryItemDraft) throws
    func deleteItem(id: UUID) throws
    func fetchCategories() throws -> [String]
}

public protocol TagRepository: Sendable {
    func fetchTags() throws -> [(id: UUID, draft: ColorTagDraft)]
    func createTag(_ draft: ColorTagDraft) throws -> UUID
    func updateTag(id: UUID, draft: ColorTagDraft) throws
    func deleteTag(id: UUID) throws
}

/// v2 extension point: CloudKit-backed sync conforming to the same protocols.
public protocol SyncRepository: TripRepository, LibraryRepository, TagRepository {}

public enum SyncRepositoryStub {
    public static let documentation = """
    v2: Implement SyncRepository using CloudKit CKShare for trip collaboration.
    Trip.ownerId and Trip.collaboratorIds are reserved for multi-user access control.
    """
}
