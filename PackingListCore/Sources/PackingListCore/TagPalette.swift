import Foundation

public enum TagPalette {
    public static let colorNames = [
        "blue", "orange", "green", "red", "purple",
        "teal", "pink", "yellow", "indigo", "mint", "brown", "gray"
    ]

    public static func colorName(for index: Int) -> String {
        guard index >= 0, index < colorNames.count else { return colorNames[0] }
        return colorNames[index]
    }

    public static func normalizedIndex(_ index: Int) -> Int {
        guard !colorNames.isEmpty else { return 0 }
        return ((index % colorNames.count) + colorNames.count) % colorNames.count
    }
}
