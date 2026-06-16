import Foundation

public enum PackingStyle: String, Codable, CaseIterable, Sendable, Identifiable {
    case roll = "roll"
    case fold = "fold"
    case hardCase = "hard_case"
    case liquidBag = "liquid_bag"
    case electronicsPouch = "electronics_pouch"
    case wearOnPlane = "wear_on_plane"
    case loose = "loose"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .roll: return "Roll"
        case .fold: return "Fold"
        case .hardCase: return "Hard case"
        case .liquidBag: return "Liquid bag"
        case .electronicsPouch: return "Electronics pouch"
        case .wearOnPlane: return "Wear on plane"
        case .loose: return "Loose"
        }
    }
}
