import SwiftUI
import SwiftData
import UniformTypeIdentifiers
import PackingListCore

struct AddFromLibrarySheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let trip: TripRecord
    let targetBag: TripBagRecord

    @Query(sort: \LibraryItemRecord.name) private var allItems: [LibraryItemRecord]
    @Query(sort: \ColorTagRecord.name) private var tags: [ColorTagRecord]

    @State private var search = ""
    @State private var categoryFilter = ""
    @State private var tagFilterID: UUID?

    private var filteredItems: [LibraryItemRecord] {
        allItems.filter { item in
            (search.isEmpty || item.name.localizedCaseInsensitiveContains(search))
                && (categoryFilter.isEmpty || item.category == categoryFilter)
                && (tagFilterID == nil || item.colorTagId == tagFilterID)
        }
    }

    private var categories: [String] {
        Array(Set(allItems.map(\.category))).sorted()
    }

    var body: some View {
        NavigationStack {
            List {
                if filteredItems.isEmpty {
                    ContentUnavailableView(
                        "No Library Items",
                        systemImage: "books.vertical",
                        description: Text("Add items in the Library tab first.")
                    )
                } else {
                    ForEach(filteredItems) { item in
                        Button {
                            add(item)
                        } label: {
                            LibraryItemRow(item: item, tags: tags)
                        }
                        .draggable(LibraryDragPayload(itemID: item.id).stringValue)
                    }
                }
            }
            .searchable(text: $search, prompt: "Search library")
            .navigationTitle("Add to \(targetBag.displayTitle)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("Category", selection: $categoryFilter) {
                            Text("All").tag("")
                            ForEach(categories, id: \.self) { category in
                                Text(category).tag(category)
                            }
                        }
                        if !tags.isEmpty {
                            Picker("Tag", selection: $tagFilterID) {
                                Text("All").tag(Optional<UUID>.none)
                                ForEach(tags) { tag in
                                    Text(tag.name).tag(Optional(tag.id))
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
            }
        }
    }

    private var store: LocalSwiftDataStore {
        LocalSwiftDataStore(modelContext: modelContext)
    }

    private func add(_ item: LibraryItemRecord) {
        try? store.addPackedItem(from: item, to: targetBag)
    }
}

struct LibraryDragPayload: Codable, Transferable {
    let itemID: UUID

    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .json)
    }

    var stringValue: String {
        "library:\(itemID.uuidString)"
    }

    init(itemID: UUID) {
        self.itemID = itemID
    }
}

struct LibraryItemRow: View {
    let item: LibraryItemRecord
    let tags: [ColorTagRecord]

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .foregroundStyle(.primary)
                HStack(spacing: 8) {
                    Text(item.category)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let style = item.defaultPackingStyle {
                        PackingStyleBadge(style: style)
                    }
                    if let tag = tags.first(where: { $0.id == item.colorTagId }) {
                        ColorTagChip(name: tag.name, colorIndex: tag.colorIndex)
                    }
                }
            }
            Spacer()
            if let bag = item.defaultBagType {
                Image(systemName: bag.systemImage)
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Default bag: \(bag.displayName)")
            }
        }
    }
}

#Preview {
    AddFromLibrarySheet(
        trip: PreviewData.sampleTrip,
        targetBag: PreviewData.sampleTrip.bags[0]
    )
    .modelContainer(PreviewData.container)
}
