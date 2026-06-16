import Foundation

public enum BagType: String, Codable, CaseIterable, Sendable, Identifiable {
    case carryOn = "carry_on"
    case personalItem = "personal_item"
    case checkedBag = "checked_bag"
    case cameraCase = "camera_case"
    case diveBag = "dive_bag"
    case dayPack = "day_pack"
    case toiletryKit = "toiletry_kit"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .carryOn: return "Carry-on"
        case .personalItem: return "Personal item"
        case .checkedBag: return "Checked bag"
        case .cameraCase: return "Camera case"
        case .diveBag: return "Dive bag"
        case .dayPack: return "Day pack"
        case .toiletryKit: return "Toiletry kit"
        }
    }

    public var systemImage: String {
        switch self {
        case .carryOn: return "bag.fill"
        case .personalItem: return "backpack.fill"
        case .checkedBag: return "suitcase.fill"
        case .cameraCase: return "camera.fill"
        case .diveBag: return "figure.open.water.swim"
        case .dayPack: return "sun.max.fill"
        case .toiletryKit: return "drop.fill"
        }
    }
}
