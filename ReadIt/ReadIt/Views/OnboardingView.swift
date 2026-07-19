import AppKit
import ReadItCore
import SwiftUI

private enum OnboardingStep {
    case choose
    case haveKey
    case needKey
}

struct OnboardingView: View {
    @Bindable var appState: AppState
    @State private var step: OnboardingStep = .choose
    @State private var apiKey = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            ReadItTheme.backgroundGradient.ignoresSafeArea()
            DecorativeRings()
                .opacity(0.35)
                .allowsHitTesting(false)

            VStack(alignment: .leading, spacing: 28) {
                BrandMark()
                    .padding(.top, 8)

                Group {
                    switch step {
                    case .choose:
                        choosePane
                    case .haveKey:
                        haveKeyPane
                    case .needKey:
                        needKeyPane
                    }
                }
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))

                Spacer(minLength: 0)
            }
            .padding(36)
            .animation(.spring(response: 0.45, dampingFraction: 0.86), value: step)
        }
    }

    private var choosePane: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Let’s connect Grok Voice")
                .font(.system(.title2, design: .serif).weight(.semibold))
                .foregroundStyle(ReadItTheme.ink)

            Text("Read It uses your xAI API key to speak highlighted text. Do you already have one, or do you need to get one?")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(ReadItTheme.ink.opacity(0.72))
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 14) {
                OnboardingChoiceCard(
                    title: "I have one",
                    subtitle: "Paste your key and start listening.",
                    symbol: "key.fill"
                ) {
                    step = .haveKey
                }
                OnboardingChoiceCard(
                    title: "I need to get one",
                    subtitle: "Open xAI console and create a key.",
                    symbol: "arrow.up.right.square.fill"
                ) {
                    step = .needKey
                }
            }
        }
    }

    private var haveKeyPane: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button {
                step = .choose
            } label: {
                Label("Back", systemImage: "chevron.left")
            }
            .buttonStyle(.plain)
            .foregroundStyle(ReadItTheme.spruce)

            Text("Paste your xAI API key")
                .font(.system(.title2, design: .serif).weight(.semibold))

            Text("It stays in your Mac’s Keychain. Read It never writes the key into settings profiles.")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(ReadItTheme.ink.opacity(0.7))

            SecureField("xai-…", text: $apiKey)
                .textFieldStyle(.plain)
                .padding(14)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(.white.opacity(0.72))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(ReadItTheme.spruce.opacity(0.25), lineWidth: 1)
                )

            if let errorMessage {
                Text(errorMessage)
                    .font(.system(.footnote, design: .rounded))
                    .foregroundStyle(.red.opacity(0.85))
            }

            HStack {
                Button("Validate & Save") {
                    Task { await save() }
                }
                .buttonStyle(ReadItPrimaryButtonStyle())
                .disabled(apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)

                if isSaving {
                    ProgressView()
                        .controlSize(.small)
                }
            }
        }
    }

    private var needKeyPane: some View {
        VStack(alignment: .leading, spacing: 16) {
            Button {
                step = .choose
            } label: {
                Label("Back", systemImage: "chevron.left")
            }
            .buttonStyle(.plain)
            .foregroundStyle(ReadItTheme.spruce)

            Text("Get an xAI API key")
                .font(.system(.title2, design: .serif).weight(.semibold))

            Text("Create a key in the xAI console, then come back here to paste it. TTS docs are linked if you want to skim voice options first.")
                .font(.system(.body, design: .rounded))
                .foregroundStyle(ReadItTheme.ink.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: 10) {
                LinkRow(
                    title: "Open xAI console",
                    subtitle: "Sign in and create an API key",
                    url: OnboardingLinks.apiKeysConsole
                )
                LinkRow(
                    title: "xAI docs overview",
                    subtitle: "Account and API getting started",
                    url: OnboardingLinks.createAPIKeyHelp
                )
                LinkRow(
                    title: "Text to Speech docs",
                    subtitle: "Voices, speed, and request format",
                    url: OnboardingLinks.ttsDocs
                )
            }

            Button("I have my key now") {
                step = .haveKey
            }
            .buttonStyle(ReadItPrimaryButtonStyle())
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            try await appState.saveAPIKey(apiKey)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct OnboardingChoiceCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: symbol)
                    .font(.title2)
                    .foregroundStyle(ReadItTheme.amber)
                Text(title)
                    .font(.system(.headline, design: .serif))
                    .foregroundStyle(ReadItTheme.ink)
                Text(subtitle)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(ReadItTheme.ink.opacity(0.65))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(18)
            .frame(maxWidth: .infinity, minHeight: 140, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(.white.opacity(0.68))
                    .shadow(color: ReadItTheme.softShadow, radius: 18, y: 8)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct LinkRow: View {
    let title: String
    let subtitle: String
    let url: URL

    var body: some View {
        Button {
            NSWorkspace.shared.open(url)
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(.headline, design: .rounded))
                        .foregroundStyle(ReadItTheme.ink)
                    Text(subtitle)
                        .font(.system(.caption, design: .rounded))
                        .foregroundStyle(ReadItTheme.ink.opacity(0.6))
                }
                Spacer()
                Image(systemName: "arrow.up.right")
                    .foregroundStyle(ReadItTheme.spruce)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(.white.opacity(0.7))
            )
        }
        .buttonStyle(.plain)
    }
}

private struct DecorativeRings: View {
    var body: some View {
        GeometryReader { geo in
            Circle()
                .stroke(ReadItTheme.spruce.opacity(0.12), lineWidth: 40)
                .frame(width: 420, height: 420)
                .position(x: geo.size.width - 40, y: 80)
            Circle()
                .fill(ReadItTheme.amber.opacity(0.12))
                .frame(width: 220, height: 220)
                .position(x: 40, y: geo.size.height - 40)
        }
    }
}

struct ReadItPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.headline, design: .rounded))
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(ReadItTheme.spruce.opacity(configuration.isPressed ? 0.85 : 1))
            )
            .foregroundStyle(ReadItTheme.parchment)
    }
}
