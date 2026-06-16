import SwiftUI
import SwiftData
import PackingListCore

struct LibraryListView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \LibraryItemRecord.name) private var items: [LibraryItemRecord]
    @Query(sort: \ColorTagRecord.name) private var tags: [ColorTagRecord]

    @State private var search = ""
    @State private var categoryFilter = ""
    @State private var tagFilterID: UUID?
    @State private var showingCreate = false
    @State private var editingItem: LibraryItemRecord?
    @State private var showingTags = false

    private var filteredItems: [LibraryItemRecord] {
        items.filter { item in
            (search.isEmpty || item.name.localizedCaseInsensitiveContains(search))
                && (categoryFilter.isEmpty || item.category == categoryFilter)
                && (tagFilterID == nil || item.colorTagId == tagFilterID)
        }
    }

    private var categories: [String] {
        var seen = Set<String>()
        return (DefaultCategories.suggested + items.map(\.category))
            .filter { seen.insert($0).inserted }
    }

    var body: some View {
        NavigationStack {
            Group {
                if items.isEmpty {
                    ContentUnavailableView(
                        "Build Your Library",
                        systemImage: "books.vertical",
                        description: Text("Save reusable items like clothes, camera gear, and dive equipment.")
                    )
                } else {
                    List {
                        ForEach(filteredItems) { item in
                            Button {
                                editingItem = item
                            } label: {
                                LibraryItemRow(item: item, tags: tags)
                            }
                            .swipeActions {
                                Button(role: .destructive) {
                                    deleteItem(item)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Library")
            .searchable(text: $search, prompt: "Search items")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Tags") { showingTags = true }
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
                            Picker("Color tag", selection: $tagFilterID) {
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
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingCreate = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreate) {
                LibraryItemFormView(mode: .create)
            }
            .sheet(item: $editingItem) { item in
                LibraryItemFormView(mode: .edit(item))
            }
            .sheet(isPresented: $showingTags) {
                ColorTagsView()
            }
        }
    }

    private func deleteItem(_ item: LibraryItemRecord) {
        try? LocalSwiftDataStore(modelContext: modelContext).deleteLibraryItem(item)
    }
}

enum LibraryItemFormMode {
    case create
    case edit(LibraryItemRecord)
}

struct LibraryItemFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let mode: LibraryItemFormMode

    @Query(sort: \ColorTagRecord.name) private var tags: [ColorTagRecord]

    @State private var name = ""
    @State private var category = DefaultCategories.suggested[0]
    @State private var customCategory = ""
    @State private var useCustomCategory = false
    @State private var notes = ""
    @State private var selectedBag: BagType?
    @State private var selectedStyle: PackingStyle?
    @State private var selectedTagID: UUID?

    var body: some View {
        NavigationStack {
            Form {
                TextField("Item name", text: $name)

                Section("Category") {
                    Toggle("Custom category", isOn: $useCustomCategory)
                    if useCustomCategory {
                        TextField("Category name", text: $customCategory)
                    } else {
                        Picker("Category", selection: $category) {
                            ForEach(DefaultCategories.suggested, id: \.self) { value in
                                Text(value).tag(value)
                            }
                        }
                    }
                }

                Picker("Default bag", selection: $selectedBag) {
                    Text("None").tag(Optional<BagType>.none)
                    ForEach(BagType.allCases) { bag in
                        Text(bag.displayName).tag(Optional(bag))
                    }
                }

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

                TextField("Notes", text: $notes, axis: .vertical)
            }
            .navigationTitle(modeTitle)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear(perform: load)
        }
    }

    private var modeTitle: String {
        switch mode {
        case .create: return "New Item"
        case .edit: return "Edit Item"
        }
    }

    private var resolvedCategory: String {
        useCustomCategory ? customCategory : category
    }

    private func load() {
        guard case let .edit(item) = mode else { return }
        name = item.name
        if DefaultCategories.suggested.contains(item.category) {
            category = item.category
            useCustomCategory = false
        } else {
            customCategory = item.category
            useCustomCategory = true
        }
        notes = item.notes ?? ""
        selectedBag = item.defaultBagType
        selectedStyle = item.defaultPackingStyle
        selectedTagID = item.colorTagId
    }

    private func save() {
        let draft = LibraryItemDraft(
            name: name.trimmingCharacters(in: .whitespaces),
            category: resolvedCategory.trimmingCharacters(in: .whitespaces),
            defaultBagType: selectedBag,
            defaultPackingStyle: selectedStyle,
            colorTagID: selectedTagID,
            notes: notes.isEmpty ? nil : notes
        )
        let store = LocalSwiftDataStore(modelContext: modelContext)
        switch mode {
        case .create:
            _ = try? store.createLibraryItem(draft)
        case let .edit(item):
            try? store.updateLibraryItem(item, draft: draft)
        }
        dismiss()
    }
}

#Preview {
    LibraryListView()
        .modelContainer(PreviewData.container)
}
