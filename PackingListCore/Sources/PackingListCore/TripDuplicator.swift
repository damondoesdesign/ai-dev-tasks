import Foundation

public struct TripSnapshot: Equatable, Sendable {
    public var id: UUID
    public var name: String
    public var bags: [TripBagSnapshot]
    public var items: [PackedItemSnapshot]

    public init(id: UUID, name: String, bags: [TripBagSnapshot], items: [PackedItemSnapshot]) {
        self.id = id
        self.name = name
        self.bags = bags
        self.items = items
    }
}

public struct TripBagSnapshot: Equatable, Sendable, Identifiable {
    public var id: UUID
    public var bagType: BagType
    public var nickname: String?
    public var sortOrder: Int

    public init(id: UUID, bagType: BagType, nickname: String?, sortOrder: Int) {
        self.id = id
        self.bagType = bagType
        self.nickname = nickname
        self.sortOrder = sortOrder
    }
}

public struct PackedItemSnapshot: Equatable, Sendable, Identifiable {
    public var id: UUID
    public var tripBagID: UUID
    public var libraryItemID: UUID?
    public var name: String
    public var category: String
    public var colorTagID: UUID?
    public var packingStyle: PackingStyle?
    public var isPacked: Bool
    public var sortOrder: Int
    public var notes: String?

    public init(
        id: UUID,
        tripBagID: UUID,
        libraryItemID: UUID?,
        name: String,
        category: String,
        colorTagID: UUID?,
        packingStyle: PackingStyle?,
        isPacked: Bool,
        sortOrder: Int,
        notes: String?
    ) {
        self.id = id
        self.tripBagID = tripBagID
        self.libraryItemID = libraryItemID
        self.name = name
        self.category = category
        self.colorTagID = colorTagID
        self.packingStyle = packingStyle
        self.isPacked = isPacked
        self.sortOrder = sortOrder
        self.notes = notes
    }
}

public enum TripDuplicator {
    /// Deep-copies a trip for a new packing run. Packed state resets to false.
    public static func duplicate(_ source: TripSnapshot, newName: String) -> TripSnapshot {
        let newTripID = UUID()
        var bagIDMap: [UUID: UUID] = [:]

        let newBags = source.bags.sorted(by: { $0.sortOrder < $1.sortOrder }).map { bag in
            let newBagID = UUID()
            bagIDMap[bag.id] = newBagID
            return TripBagSnapshot(
                id: newBagID,
                bagType: bag.bagType,
                nickname: bag.nickname,
                sortOrder: bag.sortOrder
            )
        }

        let newItems = source.items.sorted(by: { $0.sortOrder < $1.sortOrder }).map { item in
            PackedItemSnapshot(
                id: UUID(),
                tripBagID: bagIDMap[item.tripBagID] ?? item.tripBagID,
                libraryItemID: item.libraryItemID,
                name: item.name,
                category: item.category,
                colorTagID: item.colorTagID,
                packingStyle: item.packingStyle,
                isPacked: false,
                sortOrder: item.sortOrder,
                notes: item.notes
            )
        }

        return TripSnapshot(
            id: newTripID,
            name: newName,
            bags: newBags,
            items: newItems
        )
    }
}
