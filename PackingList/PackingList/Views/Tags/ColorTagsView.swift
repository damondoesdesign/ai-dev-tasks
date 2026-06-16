import SwiftUI
import SwiftData
import PackingListCore

struct ColorTagsView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \ColorTagRecord.name) private var tags: [ColorTagRecord]

    @State private var showingCreate = false
    @State private var editingTag: ColorTagRecord?

    var body: some View {
        NavigationStack {
            List {
                if tags.isEmpty {
                    ContentUnavailableView(
                        "No Color Tags",
                        systemImage: "tag",
                        description: Text("Create tags like Dive, Photo, or Clothes to group items.")
                    )
                } else {
                    ForEach(tags) { tag in
                        Button {
                            editingTag = tag
                        } label: {
                            HStack {
                                Circle()
                                    .fill(TagColorHelper.color(for: tag.colorIndex))
                                    .frame(width: 14, height: 14)
                                Text(tag.name)
                                    .foregroundStyle(.primary)
                            }
                        }
                        .swipeActions {
                            Button(role: .destructive) {
                                try? LocalSwiftDataStore(modelContext: modelContext).deleteTag(tag)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            }
            .navigationTitle("Color Tags")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
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
                ColorTagFormView(mode: .create)
            }
            .sheet(item: $editingTag) { tag in
                ColorTagFormView(mode: .edit(tag))
            }
        }
    }
}

enum ColorTagFormMode {
    case create
    case edit(ColorTagRecord)
}

struct ColorTagFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    let mode: ColorTagFormMode

    @State private var name = ""
    @State private var colorIndex = 0

    var body: some View {
        NavigationStack {
            Form {
                TextField("Tag name (e.g. Dive, Photo)", text: $name)

                Picker("Color", selection: $colorIndex) {
                    ForEach(Array(TagPalette.colorNames.enumerated()), id: \.offset) { index, colorName in
                        HStack {
                            Circle()
                                .fill(TagColorHelper.color(for: index))
                                .frame(width: 12, height: 12)
                            Text(colorName.capitalized)
                        }
                        .tag(index)
                    }
                }
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
        case .create: return "New Tag"
        case .edit: return "Edit Tag"
        }
    }

    private func load() {
        guard case let .edit(tag) = mode else { return }
        name = tag.name
        colorIndex = tag.colorIndex
    }

    private func save() {
        let draft = ColorTagDraft(
            name: name.trimmingCharacters(in: .whitespaces),
            colorIndex: colorIndex
        )
        let store = LocalSwiftDataStore(modelContext: modelContext)
        switch mode {
        case .create:
            _ = try? store.createTag(draft)
        case let .edit(tag):
            try? store.updateTag(tag, draft: draft)
        }
        dismiss()
    }
}

#Preview {
    ColorTagsView()
        .modelContainer(PreviewData.container)
}
