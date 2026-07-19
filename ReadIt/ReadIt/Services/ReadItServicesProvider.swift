import AppKit

final class ReadItServicesProvider: NSObject {
    static let shared = ReadItServicesProvider()
    weak var appState: AppState?

    @objc func readSelection(_ pboard: NSPasteboard, userData: String?, error: AutoreleasingUnsafeMutablePointer<NSString?>) {
        let text =
            pboard.string(forType: .string)
            ?? pboard.string(forType: NSPasteboard.PasteboardType("public.utf8-plain-text"))
            ?? ""
        Task { @MainActor in
            guard let appState else { return }
            if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                appState.readCurrentSelection()
            } else {
                appState.speak(text: text)
            }
        }
    }
}
