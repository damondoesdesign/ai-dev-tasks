import AppKit
import ReadItCore

/// Global Shift+middle-click (or custom) trigger via a CGEvent tap.
final class GlobalTriggerMonitor: @unchecked Sendable {
    private let lock = NSLock()
    private var _binding: TriggerBinding
    private var tap: CFMachPort?
    private var source: CFRunLoopSource?
    var onTrigger: (() -> Void)?

    init(binding: TriggerBinding) {
        self._binding = binding
    }

    var binding: TriggerBinding {
        get {
            lock.lock()
            defer { lock.unlock() }
            return _binding
        }
        set {
            lock.lock()
            _binding = newValue
            lock.unlock()
        }
    }

    func update(binding: TriggerBinding) {
        self.binding = binding
    }

    @MainActor
    func start() {
        stop()
        let mask =
            (1 << CGEventType.keyDown.rawValue)
            | (1 << CGEventType.otherMouseDown.rawValue)
            | (1 << CGEventType.leftMouseDown.rawValue)
            | (1 << CGEventType.rightMouseDown.rawValue)

        let callback: CGEventTapCallBack = { _, type, event, refcon in
            guard let refcon else { return Unmanaged.passUnretained(event) }
            let monitor = Unmanaged<GlobalTriggerMonitor>.fromOpaque(refcon).takeUnretainedValue()
            return monitor.handle(type: type, event: event)
        }

        let userInfo = Unmanaged.passUnretained(self).toOpaque()
        guard let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .listenOnly,
            eventsOfInterest: CGEventMask(mask),
            callback: callback,
            userInfo: userInfo
        ) else {
            return
        }

        self.tap = tap
        let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        self.source = source
        CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
    }

    @MainActor
    func stop() {
        if let source {
            CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
        }
        if let tap {
            CGEvent.tapEnable(tap: tap, enable: false)
        }
        source = nil
        tap = nil
    }

    private func handle(type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            if let tap {
                CGEvent.tapEnable(tap: tap, enable: true)
            }
            return Unmanaged.passUnretained(event)
        }

        let current = binding
        let flags = event.flags
        let shift = flags.contains(.maskShift)
        let control = flags.contains(.maskControl)
        let option = flags.contains(.maskAlternate)
        let command = flags.contains(.maskCommand)

        guard current.matchesModifiers(
            shift: shift,
            control: control,
            option: option,
            command: command
        ) else {
            return Unmanaged.passUnretained(event)
        }

        let matched: Bool
        if let mouseButton = current.mouseButton, current.keyCode == nil {
            let isMouse =
                type == .otherMouseDown
                || type == .leftMouseDown
                || type == .rightMouseDown
            let buttonNumber = Int(event.getIntegerValueField(.mouseEventButtonNumber))
            matched = isMouse && buttonNumber == mouseButton
        } else if let keyCode = current.keyCode, current.mouseButton == nil {
            let eventKey = UInt16(event.getIntegerValueField(.keyboardEventKeycode))
            matched = type == .keyDown && eventKey == keyCode
        } else if let mouseButton = current.mouseButton, current.keyCode != nil {
            let isMouse =
                type == .otherMouseDown
                || type == .leftMouseDown
                || type == .rightMouseDown
            let buttonNumber = Int(event.getIntegerValueField(.mouseEventButtonNumber))
            matched = isMouse && buttonNumber == mouseButton
        } else {
            matched = false
        }

        if matched {
            DispatchQueue.main.async { [weak self] in
                self?.onTrigger?()
            }
        }
        return Unmanaged.passUnretained(event)
    }
}
