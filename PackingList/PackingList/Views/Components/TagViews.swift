import SwiftUI
import PackingListCore

enum TagColorHelper {
    static func color(for index: Int) -> Color {
        let name = TagPalette.colorName(for: TagPalette.normalizedIndex(index))
        switch name {
        case "blue": return .blue
        case "orange": return .orange
        case "green": return .green
        case "red": return .red
        case "purple": return .purple
        case "teal": return .teal
        case "pink": return .pink
        case "yellow": return .yellow
        case "indigo": return .indigo
        case "mint": return .mint
        case "brown": return .brown
        default: return .gray
        }
    }
}

struct ColorTagChip: View {
    let name: String
    let colorIndex: Int

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(TagColorHelper.color(for: colorIndex))
                .frame(width: 8, height: 8)
            Text(name)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityLabel("\(name) tag")
    }
}

struct PackingStyleBadge: View {
    let style: PackingStyle

    var body: some View {
        Text(style.displayName)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color.secondary.opacity(0.15))
            .clipShape(Capsule())
    }
}
