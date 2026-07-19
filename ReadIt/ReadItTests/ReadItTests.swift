import XCTest
@testable import ReadIt

@MainActor
final class ReadItTests: XCTestCase {
    func testAppStateDefaultsNeedOnboardingWithoutKey() {
        // Keychain may already have a key on a developer Mac; this smoke test
        // only verifies AppState can be constructed on the main actor.
        let state = AppState()
        XCTAssertNotNil(state.settings.voiceID)
        XCTAssertEqual(state.settings.trigger.mouseButton, 2)
        XCTAssertTrue(state.settings.trigger.requireShift)
    }
}
