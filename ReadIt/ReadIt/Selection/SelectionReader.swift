import AppKit
import ApplicationServices

enum SelectionReader {
    /// Prefer Accessibility selected text; fall back to a non-destructive Cmd+C snapshot.
    static func currentSelection() -> String? {
        if let ax = accessibilitySelectedText(), !ax.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return ax
        }
        return copySelectedTextViaPasteboard()
    }

    private static func accessibilitySelectedText() -> String? {
        let systemWide = AXUIElementCreateSystemWide()
        var focused: CFTypeRef?
        let focusedStatus = AXUIElementCopyAttributeValue(
            systemWide,
            kAXFocusedUIElementAttribute as CFString,
            &focused
        )
        guard focusedStatus == .success, let element = focused else { return nil }

        var value: CFTypeRef?
        let selectedStatus = AXUIElementCopyAttributeValue(
            element as! AXUIElement,
            kAXSelectedTextAttribute as CFString,
            &value
        )
        guard selectedStatus == .success, let text = value as? String else { return nil }
        return text
    }

    private static func copySelectedTextViaPasteboard() -> String? {
        let pasteboard = NSPasteboard.general
        let previous = pasteboard.pasteboardItems?.compactMap { item -> [NSPasteboard.PasteboardType: Data]? in
            var map: [NSPasteboard.PasteboardType: Data] = [:]
            for type in item.types {
                if let data = item.data(forType: type) {
                    map[type] = data
                }
            }
            return map.isEmpty ? nil : map
        }

        pasteboard.clearContents()
        let source = CGEventSource(stateID: .hidSystemState)
        let keyV: CGKeyCode = 8 // C
        let down = CGEvent(keyboardEventSource: source, virtualKey: keyV, keyDown: true)
        let up = CGEvent(keyboardEventSource: source, virtualKey: keyV, keyDown: false)
        down?.flags = .maskCommand
        up?.flags = .maskCommand
        down?.post(tap: .cghidEventTap)
        up?.post(tap: .cghidEventTap)

        // Brief wait for the frontmost app to place text on the pasteboard.
        let deadline = Date().addingTimeInterval(0.25)
        var text: String?
        while Date() < deadline {
            Thread.sleep(forTimeInterval: 0.02)
            if let copied = pasteboard.string(forType: .string),
               !copied.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                text = copied
                break
            }
        }

        pasteboard.clearContents()
        if let previous {
            for itemMap in previous {
                pasteboard.declareTypes(Array(itemMap.keys), owner: nil)
                for (type, data) in itemMap {
                    pasteboard.setData(data, forType: type)
                }
            }
        }
        return text
    }

    static func promptForAccessibilityIfNeeded() -> Bool {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        return AXIsProcessTrustedWithOptions(options)
    }

    static var isTrusted: Bool {
        AXIsProcessTrusted()
    }
}
