import Foundation

public struct PackingProgress: Equatable, Sendable {
    public let packed: Int
    public let total: Int

    public init(packed: Int, total: Int) {
        self.packed = packed
        self.total = total
    }

    public var label: String {
        "\(packed)/\(total) packed"
    }

    public static func calculate(from items: [Bool]) -> PackingProgress {
        let total = items.count
        let packed = items.filter { $0 }.count
        return PackingProgress(packed: packed, total: total)
    }
}

public enum TripItemFilter: String, CaseIterable, Sendable, Identifiable {
    case all
    case unpackedOnly

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .all: return "All"
        case .unpackedOnly: return "Unpacked"
        }
    }
}
