import SwiftUI
import SwiftData
import UniformTypeIdentifiers
import PackingListCore

struct TripDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var trip: TripRecord

    @Query(sort: \ColorTagRecord.name) private var tags: [ColorTagRecord]
    @Query(sort: \LibraryItemRecord.name) private var libraryItems: [LibraryItemRecord]

    @State private var itemFilter: TripItemFilter = .all
    @State private var tagFilterID: UUID?
    @State private var showingAddSheet = false
    @State private var selectedBagForAdd: TripBagRecord?
    @State private var editingItem: PackedItemRecord?

    private var sortedBags: [TripBagRecord] {
        trip.bags.sorted(by: { $0.sortOrder < $1.sortOrder })
    }

    private var progress: PackingProgress {
        PackingProgress.calculate(from: trip.packedItems.map(\.isPacked))
    }

    var body: some View {
        List {
            Section {
                Text(progress.label)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            ForEach(sortedBags) { bag in
                BagSectionView(
                    bag: bag,
                    trip: trip,
                    tags: tags,
                    itemFilter: itemFilter,
                    tagFilterID: tagFilterID,
                    modelContext: modelContext,
                    onToggle: toggleItem,
                    onDelete: deleteItem,
                    onMove: moveItem,
                    onEdit: { editingItem = $0 },
                    onAddTapped: {
                        selectedBagForAdd = bag
                        showingAddSheet = true
                    }
                )
            }
            .onMove(perform: moveBags)
        }
        .navigationTitle(trip.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Picker("Show", selection: $itemFilter) {
                        ForEach(TripItemFilter.allCases) { filter in
                            Text(filter.label).tag(filter)
                        }
                    }
                    if !tags.isEmpty {
                        Picker("Tag", selection: $tagFilterID) {
                            Text("All tags").tag(Optional<UUID>.none)
                            ForEach(tags) { tag in
                                Text(tag.name).tag(Optional(tag.id))
                            }
                        }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                EditButton()
            }
        }
        .sheet(isPresented: $showingAddSheet) {
            if let bag = selectedBagForAdd {
                AddFromLibrarySheet(trip: trip, targetBag: bag)
            }
        }
        .sheet(item: $editingItem) { item in
            PackedItemEditSheet(item: item, tags: tags)
        }
    }

    private var store: LocalSwiftDataStore {
        LocalSwiftDataStore(modelContext: modelContext)
    }

    private func toggleItem(_ item: PackedItemRecord) {
        try? store.togglePacked(item)
    }

    private func deleteItem(_ item: PackedItemRecord) {
        try? store.removePackedItem(item)
    }

    private func moveItem(_ item: PackedItemRecord, to bag: TripBagRecord) {
        try? store.movePackedItem(item, to: bag)
    }

    private func moveBags(from source: IndexSet, to destination: Int) {
        var bags = sortedBags
        bags.move(fromOffsets: source, toOffset: destination)
        try? store.reorderBags(trip: trip, bags: bags)
    }
}

private struct BagSectionView: View {
    let bag: TripBagRecord
    let trip: TripRecord
    let tags: [ColorTagRecord]
    let itemFilter: TripItemFilter
    let tagFilterID: UUID?
    let modelContext: ModelContext
    let onToggle: (PackedItemRecord) -> Void
    let onDelete: (PackedItemRecord) -> Void
    let onMove: (PackedItemRecord, TripBagRecord) -> Void
    let onEdit: (PackedItemRecord) -> Void
    let onAddTapped: () -> Void

    @State private var isTargeted = false

    private var items: [PackedItemRecord] {
        trip.packedItems
            .filter { $0.tripBag?.id == bag.id }
            .filter { item in
                switch itemFilter {
                case .all: return true
                case .unpackedOnly: return !item.isPacked
                }
            }
            .filter { item in
                guard let tagFilterID else { return true }
                return item.colorTagId == tagFilterID
            }
            .sorted(by: { $0.sortOrder < $1.sortOrder })
    }

    private var progress: PackingProgress {
        let allInBag = trip.packedItems.filter { $0.tripBag?.id == bag.id }
        return PackingProgress.calculate(from: allInBag.map(\.isPacked))
    }

    var body: some View {
        Section {
            if items.isEmpty {
                Text("Drop items here or tap Add")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
            } else {
                ForEach(items) { item in
                    PackedItemRow(item: item, tags: tags)
                        .contentShape(Rectangle())
                        .onTapGesture { onToggle(item) }
                        .swipeActions {
                            Button(role: .destructive) { onDelete(item) } label: {
                                Label("Remove", systemImage: "trash")
                            }
                            Button { onEdit(item) } label: {
                                Label("Edit", systemImage: "pencil")
                            }
                        }
                        .contextMenu {
                            Menu("Move to bag") {
                                ForEach(trip.bags.sorted(by: { $0.sortOrder < $1.sortOrder })) { destination in
                                    if destination.id != bag.id {
                                        Button(destination.displayTitle) {
                                            onMove(item, destination)
                                        }
                                    }
                                }
                            }
                        }
                        .draggable(item.id.uuidString)
                }
                .onMove { indices, newOffset in
                    var reordered = items
                    reordered.move(fromOffsets: indices, toOffset: newOffset)
                    try? LocalSwiftDataStore(modelContext: modelContext).reorderPackedItems(in: bag, items: reordered)
                }
            }

            Button {
                onAddTapped()
            } label: {
                Label("Add from Library", systemImage: "plus.circle")
            }
        } header: {
            HStack {
                Label(bag.displayTitle, systemImage: bag.bagType.systemImage)
                Spacer()
                Text(progress.label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .dropDestination(for: String.self) { droppedIDs, _ in
            guard let payload = droppedIDs.first else { return false }

            if payload.hasPrefix("library:"),
               let uuidString = payload.split(separator: ":").last,
               let libraryID = UUID(uuidString: String(uuidString)) {
                let libraryItems = (try? modelContext.fetch(FetchDescriptor<LibraryItemRecord>())) ?? []
                if let libraryItem = libraryItems.first(where: { $0.id == libraryID }) {
                    try? LocalSwiftDataStore(modelContext: modelContext).addPackedItem(from: libraryItem, to: bag)
                    return true
                }
                return false
            }

            guard let itemID = UUID(uuidString: payload),
                  let item = trip.packedItems.first(where: { $0.id == itemID }) else {
                return false
            }
            onMove(item, bag)
            return true
        } isTargeted: { targeted in
            isTargeted = targeted
        }
        .listRowBackground(isTargeted ? Color.accentColor.opacity(0.12) : nil)
    }
}

private struct PackedItemRow: View {
    let item: PackedItemRecord
    let tags: [ColorTagRecord]

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: item.isPacked ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(item.isPacked ? .green : .secondary)
                .accessibilityLabel(item.isPacked ? "Packed" : "Not packed")

            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .strikethrough(item.isPacked)
                HStack(spacing: 8) {
                    Text(item.category)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if let style = item.packingStyle {
                        PackingStyleBadge(style: style)
                    }
                    if let tag = tags.first(where: { $0.id == item.colorTagId }) {
                        ColorTagChip(name: tag.name, colorIndex: tag.colorIndex)
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

struct PackedItemEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Bindable var item: PackedItemRecord
    let tags: [ColorTagRecord]

    @State private var name: String = ""
    @State private var category: String = ""
    @State private var notes: String = ""
    @State private var selectedTagID: UUID?
    @State private var selectedStyle: PackingStyle?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Category", text: $category)
                TextField("Notes", text: $notes, axis: .vertical)

                Picker("Packing style", selection: $selectedStyle) {
                    Text("None").tag(Optional<PackingStyle>.none)
                    ForEach(PackingStyle.allCases) { style in
                        Text(style.displayName).tag(Optional(style))
                    }
                }

                Picker("Color tag", selection: $selectedTagID) {
                    Text("None").tag(Optional<UUID>.none)
                    ForEach(tags) { tag in
                        Text(tag.name).tag(Optional(tag.id))
                    }
                }
            }
            .navigationTitle("Edit Item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                }
            }
            .onAppear {
                name = item.name
                category = item.category
                notes = item.notes ?? ""
                selectedTagID = item.colorTagId
                selectedStyle = item.packingStyle
            }
        }
    }

    private func save() {
        let draft = LibraryItemDraft(
            name: name,
            category: category,
            defaultPackingStyle: selectedStyle,
            colorTagID: selectedTagID,
            notes: notes.isEmpty ? nil : notes
        )
        try? LocalSwiftDataStore(modelContext: modelContext).updatePackedItem(item, draft: draft)
        dismiss()
    }
}

#Preview {
    NavigationStack {
        TripDetailView(trip: PreviewData.sampleTrip)
    }
    .modelContainer(PreviewData.container)
}
