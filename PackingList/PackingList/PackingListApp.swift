import SwiftUI
import SwiftData
import PackingListCore

@main
struct PackingListApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            TripRecord.self,
            TripBagRecord.self,
            LibraryItemRecord.self,
            PackedItemRecord.self,
            ColorTagRecord.self
        ])
    }
}
