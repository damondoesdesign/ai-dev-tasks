import AVFoundation
import Foundation

@MainActor
final class SpeechPlayer: NSObject, AVAudioPlayerDelegate {
    private var player: AVAudioPlayer?
    private var temporaryURL: URL?
    var onFinished: (() -> Void)?

    var isPlaying: Bool { player?.isPlaying == true }

    func play(mp3Data: Data) throws {
        stop()
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("readit-\(UUID().uuidString).mp3")
        try mp3Data.write(to: url, options: .atomic)
        temporaryURL = url
        do {
            let audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer.delegate = self
            audioPlayer.prepareToPlay()
            player = audioPlayer
            guard audioPlayer.play() else {
                throw ReadItPlaybackError.couldNotStart
            }
        } catch {
            throw ReadItPlaybackError.couldNotStart
        }
    }

    func stop() {
        player?.stop()
        player = nil
        if let temporaryURL {
            try? FileManager.default.removeItem(at: temporaryURL)
        }
        temporaryURL = nil
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.stop()
            self.onFinished?()
        }
    }
}

enum ReadItPlaybackError: LocalizedError {
    case couldNotStart

    var errorDescription: String? {
        "Could not start audio playback."
    }
}
