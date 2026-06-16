import XCTest
@testable import PackingListCore

final class PackingListAppLogicTests: XCTestCase {
    func testDefaultCategoriesAreNonEmpty() {
        XCTAssertFalse(DefaultCategories.suggested.isEmpty)
    }

    func testTripItemFilterLabels() {
        XCTAssertEqual(TripItemFilter.all.label, "All")
        XCTAssertEqual(TripItemFilter.unpackedOnly.label, "Unpacked")
    }
}
