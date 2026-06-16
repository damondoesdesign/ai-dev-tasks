import Foundation
import SwiftData
import PackingListCore

@Model
final class TripRecord {
    @Attribute(.unique) var id: UUID
    var name: String
    var startDate: Date?
    var endDate: Date?
    var notes: String?
    var ownerId: String?
    var collaboratorIds: [String]
    var createdAt: Date
    var updatedAt: Date
    var version: Int

    @Relationship(deleteRule: .cascade, inverse: \TripBagRecord.trip)
    var bags: [TripBagRecord]

    @Relationship(deleteRule: .cascade, inverse: \PackedItemRecord.trip)
    var packedItems: [PackedItemRecord]

    init(
        id: UUID = UUID(),
        name: String,
        startDate: Date? = nil,
        endDate: Date? = nil,
        notes: String? = nil,
        ownerId: String? = nil,
        collaboratorIds: [String] = [],
        createdAt: Date = .now,
        updatedAt: Date = .now,
        version: Int = 1,
        bags: [TripBagRecord] = [],
        packedItems: [PackedItemRecord] = []
    ) {
        self.id = id
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.notes = notes
        self.ownerId = ownerId
        self.collaboratorIds = collaboratorIds
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.version = version
        self.bags = bags
        self.packedItems = packedItems
    }

    func bump() {
        updatedAt = .now
        version += 1
    }

    var snapshot: TripSnapshot {
        TripSnapshot(
            id: id,
            name: name,
            bags: bags.sorted(by: { $0.sortOrder < $1.sortOrder }).map(\.snapshot),
            items: packedItems.sorted(by: { $0.sortOrder < $1.sortOrder }).map(\.snapshot)
        )
    }
}

@Model
final class TripBagRecord {
    @Attribute(.unique) var id: UUID
    var bagTypeRaw: String
    var nickname: String?
    var sortOrder: Int

    var trip: TripRecord?

    init(id: UUID = UUID(), bagType: BagType, nickname: String? = nil, sortOrder: Int) {
        self.id = id
        self.bagTypeRaw = bagType.rawValue
        self.nickname = nickname
        self.sortOrder = sortOrder
    }

    var bagType: BagType {
        get { BagType(rawValue: bagTypeRaw) ?? .carryOn }
        set { bagTypeRaw = newValue.rawValue }
    }

    var displayTitle: String {
        if let nickname, !nickname.isEmpty {
            return nickname
        }
        return bagType.displayName
    }

    var snapshot: TripBagSnapshot {
        TripBagSnapshot(id: id, bagType: bagType, nickname: nickname, sortOrder: sortOrder)
    }
}

@Model
final class LibraryItemRecord {
    @Attribute(.unique) var id: UUID
    var name: String
    var category: String
    var defaultBagTypeRaw: String?
    var defaultPackingStyleRaw: String?
    var colorTagId: UUID?
    var notes: String?
    var createdAt: Date
    var updatedAt: Date
    var version: Int

    init(
        id: UUID = UUID(),
        name: String,
        category: String,
        defaultBagType: BagType? = nil,
        defaultPackingStyle: PackingStyle? = nil,
        colorTagId: UUID? = nil,
        notes: String? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        version: Int = 1
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.defaultBagTypeRaw = defaultBagType?.rawValue
        self.defaultPackingStyleRaw = defaultPackingStyle?.rawValue
        self.colorTagId = colorTagId
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.version = version
    }

    var defaultBagType: BagType? {
        get { defaultBagTypeRaw.flatMap(BagType.init(rawValue:)) }
        set { defaultBagTypeRaw = newValue?.rawValue }
    }

    var defaultPackingStyle: PackingStyle? {
        get { defaultPackingStyleRaw.flatMap(PackingStyle.init(rawValue:)) }
        set { defaultPackingStyleRaw = newValue?.rawValue }
    }

    var draft: LibraryItemDraft {
        LibraryItemDraft(
            name: name,
            category: category,
            defaultBagType: defaultBagType,
            defaultPackingStyle: defaultPackingStyle,
            colorTagID: colorTagId,
            notes: notes
        )
    }

    func apply(_ draft: LibraryItemDraft) {
        name = draft.name
        category = draft.category
        defaultBagType = draft.defaultBagType
        defaultPackingStyle = draft.defaultPackingStyle
        colorTagId = draft.colorTagID
        notes = draft.notes
        updatedAt = .now
        version += 1
    }
}

@Model
final class PackedItemRecord {
    @Attribute(.unique) var id: UUID
    var libraryItemId: UUID?
    var name: String
    var category: String
    var colorTagId: UUID?
    var packingStyleRaw: String?
    var isPacked: Bool
    var sortOrder: Int
    var notes: String?
    var createdAt: Date
    var updatedAt: Date
    var version: Int

    var trip: TripRecord?
    var tripBag: TripBagRecord?

    init(
        id: UUID = UUID(),
        libraryItemId: UUID? = nil,
        name: String,
        category: String,
        colorTagId: UUID? = nil,
        packingStyle: PackingStyle? = nil,
        isPacked: Bool = false,
        sortOrder: Int,
        notes: String? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        version: Int = 1
    ) {
        self.id = id
        self.libraryItemId = libraryItemId
        self.name = name
        self.category = category
        self.colorTagId = colorTagId
        self.packingStyleRaw = packingStyle?.rawValue
        self.isPacked = isPacked
        self.sortOrder = sortOrder
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.version = version
    }

    var packingStyle: PackingStyle? {
        get { packingStyleRaw.flatMap(PackingStyle.init(rawValue:)) }
        set { packingStyleRaw = newValue?.rawValue }
    }

    var snapshot: PackedItemSnapshot {
        PackedItemSnapshot(
            id: id,
            tripBagID: tripBag?.id ?? UUID(),
            libraryItemID: libraryItemId,
            name: name,
            category: category,
            colorTagID: colorTagId,
            packingStyle: packingStyle,
            isPacked: isPacked,
            sortOrder: sortOrder,
            notes: notes
        )
    }

    func apply(_ draft: LibraryItemDraft) {
        name = draft.name
        category = draft.category
        colorTagId = draft.colorTagID
        packingStyle = draft.defaultPackingStyle
        notes = draft.notes
        updatedAt = .now
        version += 1
    }
}

@Model
final class ColorTagRecord {
    @Attribute(.unique) var id: UUID
    var name: String
    var colorIndex: Int
    var createdAt: Date
    var updatedAt: Date
    var version: Int

    init(
        id: UUID = UUID(),
        name: String,
        colorIndex: Int,
        createdAt: Date = .now,
        updatedAt: Date = .now,
        version: Int = 1
    ) {
        self.id = id
        self.name = name
        self.colorIndex = TagPalette.normalizedIndex(colorIndex)
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.version = version
    }

    var draft: ColorTagDraft {
        ColorTagDraft(name: name, colorIndex: colorIndex)
    }

    func apply(_ draft: ColorTagDraft) {
        name = draft.name
        colorIndex = TagPalette.normalizedIndex(draft.colorIndex)
        updatedAt = .now
        version += 1
    }
}
