import SwiftUI
import SwiftData
import PackingListCore

struct TripsListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \TripRecord.updatedAt, order: .reverse) private var trips: [TripRecord]

    @State private var showingCreate = false
    @State private var tripToDelete: TripRecord?

    var body: some View {
        NavigationStack {
            Group {
                if trips.isEmpty {
                    ContentUnavailableView(
                        "No Trips Yet",
                        systemImage: "airplane",
                        description: Text("Create a trip and choose your bags to get started.")
                    )
                } else {
                    List {
                        ForEach(trips) { trip in
                            NavigationLink(value: trip.id) {
                                TripRowView(trip: trip)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    tripToDelete = trip
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                Button {
                                    duplicateTrip(trip)
                                } label: {
                                    Label("Duplicate", systemImage: "plus.square.on.square")
                                }
                                .tint(.blue)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Trips")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingCreate = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: UUID.self) { tripID in
                if let trip = trips.first(where: { $0.id == tripID }) {
                    TripDetailView(trip: trip)
                }
            }
            .sheet(isPresented: $showingCreate) {
                CreateTripView()
            }
            .alert("Delete Trip?", isPresented: Binding(
                get: { tripToDelete != nil },
                set: { if !$0 { tripToDelete = nil } }
            )) {
                Button("Delete", role: .destructive) {
                    if let trip = tripToDelete {
                        deleteTrip(trip)
                    }
                }
                Button("Cancel", role: .cancel) {
                    tripToDelete = nil
                }
            } message: {
                Text("This permanently removes the trip and its packed items.")
            }
        }
    }

    private var store: LocalSwiftDataStore {
        LocalSwiftDataStore(modelContext: modelContext)
    }

    private func deleteTrip(_ trip: TripRecord) {
        try? store.deleteTrip(trip)
        tripToDelete = nil
    }

    private func duplicateTrip(_ trip: TripRecord) {
        _ = try? store.duplicateTrip(source: trip, newName: "Copy of \(trip.name)")
    }
}

private struct TripRowView: View {
    let trip: TripRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(trip.name)
                .font(.headline)
            let progress = PackingProgress.calculate(from: trip.packedItems.map(\.isPacked))
            Text("\(trip.bags.count) bags · \(progress.label)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    TripsListView()
        .modelContainer(PreviewData.container)
}
