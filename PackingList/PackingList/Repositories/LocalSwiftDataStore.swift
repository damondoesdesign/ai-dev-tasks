import Foundation
import SwiftData
import PackingListCore

@MainActor
final class LocalSwiftDataStore {
    let modelContext: ModelContext

    init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }

    func fetchTrips() throws -> [TripRecord] {
        let descriptor = FetchDescriptor<TripRecord>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        return try modelContext.fetch(descriptor)
    }

    func createTrip(name: String, bagTypes: [BagType]) throws -> TripRecord {
        let trip = TripRecord(name: name)
        for (index, bagType) in bagTypes.enumerated() {
            let bag = TripBagRecord(bagType: bagType, sortOrder: index)
            bag.trip = trip
            trip.bags.append(bag)
            modelContext.insert(bag)
        }
        modelContext.insert(trip)
        try modelContext.save()
        return trip
    }

    func duplicateTrip(source: TripRecord, newName: String) throws -> TripRecord {
        let copySnapshot = TripDuplicator.duplicate(source.snapshot, newName: newName)
        let trip = TripRecord(id: copySnapshot.id, name: copySnapshot.name)
        modelContext.insert(trip)

        var bagRecords: [UUID: TripBagRecord] = [:]
        for bagSnapshot in copySnapshot.bags {
            let bag = TripBagRecord(
                id: bagSnapshot.id,
                bagType: bagSnapshot.bagType,
                nickname: bagSnapshot.nickname,
                sortOrder: bagSnapshot.sortOrder
            )
            bag.trip = trip
            trip.bags.append(bag)
            bagRecords[bagSnapshot.id] = bag
            modelContext.insert(bag)
        }

        for itemSnapshot in copySnapshot.items {
            guard let bag = bagRecords[itemSnapshot.tripBagID] else { continue }
            let item = PackedItemRecord(
                id: itemSnapshot.id,
                libraryItemId: itemSnapshot.libraryItemID,
                name: itemSnapshot.name,
                category: itemSnapshot.category,
                colorTagId: itemSnapshot.colorTagID,
                packingStyle: itemSnapshot.packingStyle,
                isPacked: itemSnapshot.isPacked,
                sortOrder: itemSnapshot.sortOrder,
                notes: itemSnapshot.notes
            )
            item.trip = trip
            item.tripBag = bag
            trip.packedItems.append(item)
            modelContext.insert(item)
        }

        try modelContext.save()
        return trip
    }

    func deleteTrip(_ trip: TripRecord) throws {
        modelContext.delete(trip)
        try modelContext.save()
    }

    func renameTrip(_ trip: TripRecord, name: String) throws {
        trip.name = name
        trip.bump()
        try modelContext.save()
    }

    func updateBagNickname(_ bag: TripBagRecord, nickname: String?) throws {
        bag.nickname = nickname?.isEmpty == true ? nil : nickname
        bag.trip?.bump()
        try modelContext.save()
    }

    func reorderBags(trip: TripRecord, bags: [TripBagRecord]) throws {
        for (index, bag) in bags.enumerated() {
            bag.sortOrder = index
        }
        trip.bump()
        try modelContext.save()
    }

    func addPackedItem(from libraryItem: LibraryItemRecord, to bag: TripBagRecord) throws {
        let nextOrder = (bag.trip?.packedItems.filter { $0.tripBag?.id == bag.id }.map(\.sortOrder).max() ?? -1) + 1
        let packed = PackedItemRecord(
            libraryItemId: libraryItem.id,
            name: libraryItem.name,
            category: libraryItem.category,
            colorTagId: libraryItem.colorTagId,
            packingStyle: libraryItem.defaultPackingStyle,
            sortOrder: nextOrder,
            notes: libraryItem.notes
        )
        packed.trip = bag.trip
        packed.tripBag = bag
        bag.trip?.packedItems.append(packed)
        bag.trip?.bump()
        modelContext.insert(packed)
        try modelContext.save()
    }

    func togglePacked(_ item: PackedItemRecord) throws {
        item.isPacked.toggle()
        item.updatedAt = .now
        item.version += 1
        item.trip?.bump()
        try modelContext.save()
    }

    func removePackedItem(_ item: PackedItemRecord) throws {
        item.trip?.bump()
        modelContext.delete(item)
        try modelContext.save()
    }

    func movePackedItem(_ item: PackedItemRecord, to bag: TripBagRecord) throws {
        item.tripBag = bag
        item.updatedAt = .now
        item.version += 1
        item.trip?.bump()
        try modelContext.save()
    }

    func reorderPackedItems(in bag: TripBagRecord, items: [PackedItemRecord]) throws {
        for (index, item) in items.enumerated() {
            item.sortOrder = index
        }
        bag.trip?.bump()
        try modelContext.save()
    }

    func updatePackedItem(_ item: PackedItemRecord, draft: LibraryItemDraft) throws {
        item.apply(draft)
        item.trip?.bump()
        try modelContext.save()
    }

    func fetchLibraryItems(
        search: String = "",
        category: String? = nil,
        colorTagID: UUID? = nil
    ) throws -> [LibraryItemRecord] {
        let descriptor = FetchDescriptor<LibraryItemRecord>(
            sortBy: [SortDescriptor(\.name)]
        )
        var items = try modelContext.fetch(descriptor)
        if !search.isEmpty {
            items = items.filter { $0.name.localizedCaseInsensitiveContains(search) }
        }
        if let category, !category.isEmpty {
            items = items.filter { $0.category == category }
        }
        if let colorTagID {
            items = items.filter { $0.colorTagId == colorTagID }
        }
        return items
    }

    func createLibraryItem(_ draft: LibraryItemDraft) throws -> LibraryItemRecord {
        let item = LibraryItemRecord(
            name: draft.name,
            category: draft.category,
            defaultBagType: draft.defaultBagType,
            defaultPackingStyle: draft.defaultPackingStyle,
            colorTagId: draft.colorTagID,
            notes: draft.notes
        )
        modelContext.insert(item)
        try modelContext.save()
        return item
    }

    func updateLibraryItem(_ item: LibraryItemRecord, draft: LibraryItemDraft) throws {
        item.apply(draft)
        try modelContext.save()
    }

    func deleteLibraryItem(_ item: LibraryItemRecord) throws {
        modelContext.delete(item)
        try modelContext.save()
    }

    func fetchCategories() throws -> [String] {
        let items = try fetchLibraryItems()
        let custom = Set(items.map(\.category))
        let merged = DefaultCategories.suggested + custom.sorted()
        var seen = Set<String>()
        return merged.filter { seen.insert($0).inserted }
    }

    func fetchTags() throws -> [ColorTagRecord] {
        let descriptor = FetchDescriptor<ColorTagRecord>(
            sortBy: [SortDescriptor(\.name)]
        )
        return try modelContext.fetch(descriptor)
    }

    func createTag(_ draft: ColorTagDraft) throws -> ColorTagRecord {
        let tag = ColorTagRecord(name: draft.name, colorIndex: draft.colorIndex)
        modelContext.insert(tag)
        try modelContext.save()
        return tag
    }

    func updateTag(_ tag: ColorTagRecord, draft: ColorTagDraft) throws {
        tag.apply(draft)
        try modelContext.save()
    }

    func deleteTag(_ tag: ColorTagRecord) throws {
        let tagID = tag.id
        let libraryItems = try fetchLibraryItems()
        for item in libraryItems where item.colorTagId == tagID {
            item.colorTagId = nil
        }
        let trips = try fetchTrips()
        for trip in trips {
            for packed in trip.packedItems where packed.colorTagId == tagID {
                packed.colorTagId = nil
            }
        }
        modelContext.delete(tag)
        try modelContext.save()
    }
}

// v2: CloudKit SyncRepository will conform to SyncRepository from PackingListCore.
// See SyncRepositoryStub.documentation in PackingListCore.
