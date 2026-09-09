import Foundation

/// Describes the global trigger used to read the current selection.
public struct TriggerBinding: Codable, Equatable, Sendable, Hashable {
    public var requireShift: Bool
    public var requireControl: Bool
    public var requireOption: Bool
    public var requireCommand: Bool
    /// `nil` means no keyboard key is required (mouse-only combo).
    public var keyCode: UInt16?
    /// Carbon/CG mouse button number. `2` is the middle button (wheel click).
    public var mouseButton: Int?

    public init(
        requireShift: Bool = true,
        requireControl: Bool = false,
        requireOption: Bool = false,
        requireCommand: Bool = false,
        keyCode: UInt16? = nil,
        mouseButton: Int? = 2
    ) {
        self.requireShift = requireShift
        self.requireControl = requireControl
        self.requireOption = requireOption
        self.requireCommand = requireCommand
        self.keyCode = keyCode
        self.mouseButton = mouseButton
    }

    public static let defaultBinding = TriggerBinding()

    public var displayName: String {
        var parts: [String] = []
        if requireControl { parts.append("Control") }
        if requireOption { parts.append("Option") }
        if requireShift { parts.append("Shift") }
        if requireCommand { parts.append("Command") }
        if let mouseButton {
            parts.append(Self.mouseLabel(mouseButton))
        }
        if let keyCode {
            parts.append("Key \(keyCode)")
        }
        return parts.isEmpty ? "Unassigned" : parts.joined(separator: " + ")
    }

    private static func mouseLabel(_ button: Int) -> String {
        switch button {
        case 0: return "Left Click"
        case 1: return "Right Click"
        case 2: return "Middle Click"
        default: return "Mouse Button \(button)"
        }
    }

    public func matchesModifiers(
        shift: Bool,
        control: Bool,
        option: Bool,
        command: Bool
    ) -> Bool {
        requireShift == shift
            && requireControl == control
            && requireOption == option
            && requireCommand == command
    }
}
