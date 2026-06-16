import SwiftUI
import SwiftData

struct ContentView: View {
    var body: some View {
        TabView {
            TripsListView()
                .tabItem {
                    Label("Trips", systemImage: "airplane")
                }

            LibraryListView()
                .tabItem {
                    Label("Library", systemImage: "books.vertical")
                }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(PreviewData.container)
}
