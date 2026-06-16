import XCTest
@testable import PackingListCore

/// Logic tests runnable without Xcode/iOS simulator.
final class InMemoryRepositoryLogicTests: XCTestCase {
    func testDuplicatePreservesItemMetadata() {
        let tagID = UUID()
        let libraryID = UUID()
        let bagID = UUID()

        let source = TripSnapshot(
            id: UUID(),
            name: "Photo Trip",
            bags: [TripBagSnapshot(id: bagID, bagType: .cameraCase, nickname: "Pelican", sortOrder: 0)],
            items: [
                PackedItemSnapshot(
                    id: UUID(),
                    tripBagID: bagID,
                    libraryItemID: libraryID,
                    name: "50mm Lens",
                    category: "Camera",
                    colorTagID: tagID,
                    packingStyle: .hardCase,
                    isPacked: true,
                    sortOrder: 0,
                    notes: "With cap"
                )
            ]
        )

        let copy = TripDuplicator.duplicate(source, newName: "Copy of Photo Trip")
        let copiedItem = copy.items.first!

        XCTAssertEqual(copiedItem.name, "50mm Lens")
        XCTAssertEqual(copiedItem.category, "Camera")
        XCTAssertEqual(copiedItem.colorTagID, tagID)
        XCTAssertEqual(copiedItem.packingStyle, .hardCase)
        XCTAssertEqual(copiedItem.notes, "With cap")
        XCTAssertEqual(copiedItem.libraryItemID, libraryID)
        XCTAssertFalse(copiedItem.isPacked)
    }

    func testAllPackingStylesHaveLabels() {
        for style in PackingStyle.allCases {
            XCTAssertFalse(style.displayName.isEmpty)
        }
    }

    func testPredefinedBagCount() {
        XCTAssertEqual(BagType.allCases.count, 7)
    }
}
