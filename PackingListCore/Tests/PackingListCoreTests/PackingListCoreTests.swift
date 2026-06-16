import XCTest
@testable import PackingListCore

final class PackingListCoreTests: XCTestCase {
    func testBagTypeDisplayNamesAreUnique() {
        let names = BagType.allCases.map(\.displayName)
        XCTAssertEqual(names.count, Set(names).count)
    }

    func testTripDuplicatorResetsPackedStateAndMapsBags() {
        let carryOn = UUID()
        let diveBag = UUID()
        let source = TripSnapshot(
            id: UUID(),
            name: "Bali Dive",
            bags: [
                TripBagSnapshot(id: carryOn, bagType: .carryOn, nickname: nil, sortOrder: 0),
                TripBagSnapshot(id: diveBag, bagType: .diveBag, nickname: "Scuba", sortOrder: 1)
            ],
            items: [
                PackedItemSnapshot(
                    id: UUID(),
                    tripBagID: diveBag,
                    libraryItemID: UUID(),
                    name: "Regulator",
                    category: "Dive",
                    colorTagID: UUID(),
                    packingStyle: .hardCase,
                    isPacked: true,
                    sortOrder: 0,
                    notes: nil
                )
            ]
        )

        let copy = TripDuplicator.duplicate(source, newName: "Copy of Bali Dive")

        XCTAssertNotEqual(copy.id, source.id)
        XCTAssertEqual(copy.name, "Copy of Bali Dive")
        XCTAssertEqual(copy.bags.count, 2)
        XCTAssertEqual(copy.items.count, 1)
        XCTAssertFalse(copy.items[0].isPacked)
        XCTAssertNotEqual(copy.items[0].tripBagID, diveBag)
        XCTAssertEqual(copy.items[0].name, "Regulator")
        XCTAssertEqual(copy.bags.first(where: { $0.bagType == .diveBag })?.nickname, "Scuba")
    }

    func testPackingProgressCalculation() {
        let progress = PackingProgress.calculate(from: [true, false, true, false])
        XCTAssertEqual(progress.packed, 2)
        XCTAssertEqual(progress.total, 4)
        XCTAssertEqual(progress.label, "2/4 packed")
    }

    func testTagPaletteNormalization() {
        XCTAssertEqual(TagPalette.normalizedIndex(-1), TagPalette.colorNames.count - 1)
        XCTAssertEqual(TagPalette.normalizedIndex(TagPalette.colorNames.count + 2), 2)
    }
}
