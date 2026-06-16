import SwiftUI
import SwiftData
import PackingListCore

enum TripCreationMode: String, CaseIterable, Identifiable {
    case scratch
    case duplicate

    var id: String { rawValue }

    var label: String {
        switch self {
        case .scratch: return "Start from scratch"
        case .duplicate: return "Duplicate previous trip"
        }
    }
}

struct CreateTripView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \TripRecord.updatedAt, order: .reverse) private var existingTrips: [TripRecord]

    @State private var mode: TripCreationMode = .scratch
    @State private var name = ""
    @State private var selectedBagTypes: Set<BagType> = []
    @State private var sourceTripID: UUID?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Trip") {
                    TextField("Trip name", text: $name)
                }

                Section("How to start") {
                    Picker("Mode", selection: $mode) {
                        ForEach(TripCreationMode.allCases) { option in
                            Text(option.label).tag(option)
                        }
                    }
                    .pickerStyle(.inline)

                    if mode == .duplicate {
                        Picker("Copy from", selection: $sourceTripID) {
                            Text("Select a trip").tag(Optional<UUID>.none)
                            ForEach(existingTrips) { trip in
                                Text(trip.name).tag(Optional(trip.id))
                            }
                        }
                    }
                }

                if mode == .scratch {
                    Section("Bags to bring") {
                        ForEach(BagType.allCases) { bagType in
                            Toggle(isOn: binding(for: bagType)) {
                                Label(bagType.displayName, systemImage: bagType.systemImage)
                            }
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("New Trip")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { createTrip() }
                        .disabled(!canCreate)
                }
            }
        }
    }

    private var canCreate: Bool {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
        switch mode {
        case .scratch:
            return !selectedBagTypes.isEmpty
        case .duplicate:
            return sourceTripID != nil
        }
    }

    private func binding(for bagType: BagType) -> Binding<Bool> {
        Binding(
            get: { selectedBagTypes.contains(bagType) },
            set: { isSelected in
                if isSelected {
                    selectedBagTypes.insert(bagType)
                } else {
                    selectedBagTypes.remove(bagType)
                }
            }
        )
    }

    private var store: LocalSwiftDataStore {
        LocalSwiftDataStore(modelContext: modelContext)
    }

    private func createTrip() {
        errorMessage = nil
        do {
            switch mode {
            case .scratch:
                let ordered = BagType.allCases.filter { selectedBagTypes.contains($0) }
                _ = try store.createTrip(name: name.trimmingCharacters(in: .whitespaces), bagTypes: ordered)
            case .duplicate:
                guard
                    let sourceID = sourceTripID,
                    let source = existingTrips.first(where: { $0.id == sourceID })
                else {
                    errorMessage = "Select a trip to duplicate."
                    return
                }
                _ = try store.duplicateTrip(
                    source: source,
                    newName: name.trimmingCharacters(in: .whitespaces)
                )
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    CreateTripView()
        .modelContainer(PreviewData.container)
}
