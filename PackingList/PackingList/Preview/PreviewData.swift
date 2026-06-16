import SwiftData
import Foundation
import PackingListCore

enum PreviewData {
    @MainActor
    static let container: ModelContainer = {
        let schema = Schema([
            TripRecord.self,
            TripBagRecord.self,
            LibraryItemRecord.self,
            PackedItemRecord.self,
            ColorTagRecord.self
        ])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try! ModelContainer(for: schema, configurations: [config])
        seed(into: container.mainContext)
        return container
    }()

    @MainActor
    static var sampleTrip: TripRecord {
        let trips = try! container.mainContext.fetch(FetchDescriptor<TripRecord>())
        return trips[0]
    }

    @MainActor
    private static func seed(into context: ModelContext) {
        let diveTag = ColorTagRecord(name: "Dive", colorIndex: 0)
        let photoTag = ColorTagRecord(name: "Photo", colorIndex: 1)
        context.insert(diveTag)
        context.insert(photoTag)

        let regulator = LibraryItemRecord(
            name: "Regulator",
            category: "Dive",
            defaultBagType: .diveBag,
            defaultPackingStyle: .hardCase,
            colorTagId: diveTag.id
        )
        let camera = LibraryItemRecord(
            name: "Camera body",
            category: "Camera",
            defaultBagType: .cameraCase,
            defaultPackingStyle: .hardCase,
            colorTagId: photoTag.id
        )
        context.insert(regulator)
        context.insert(camera)

        let trip = TripRecord(name: "Bali Dive")
        context.insert(trip)

        let carryOn = TripBagRecord(bagType: .carryOn, sortOrder: 0)
        let diveBag = TripBagRecord(bagType: .diveBag, nickname: "Scuba", sortOrder: 1)
        carryOn.trip = trip
        diveBag.trip = trip
        trip.bags = [carryOn, diveBag]
        context.insert(carryOn)
        context.insert(diveBag)

        let packed = PackedItemRecord(
            libraryItemId: regulator.id,
            name: regulator.name,
            category: regulator.category,
            colorTagId: regulator.colorTagId,
            packingStyle: regulator.defaultPackingStyle,
            sortOrder: 0
        )
        packed.trip = trip
        packed.tripBag = diveBag
        trip.packedItems = [packed]
        context.insert(packed)

        try? context.save()
    }
}
