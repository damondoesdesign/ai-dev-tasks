import SwiftUI

enum ReadItTheme {
    static let ink = Color(red: 0.10, green: 0.12, blue: 0.14)
    static let parchment = Color(red: 0.96, green: 0.94, blue: 0.90)
    static let mist = Color(red: 0.86, green: 0.90, blue: 0.92)
    static let spruce = Color(red: 0.12, green: 0.35, blue: 0.32)
    static let amber = Color(red: 0.86, green: 0.55, blue: 0.18)
    static let softShadow = Color.black.opacity(0.18)

    static var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 0.93, green: 0.95, blue: 0.96),
                parchment,
                mist
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

struct BrandMark: View {
    var compact: Bool = false

    var body: some View {
        HStack(spacing: compact ? 8 : 12) {
            ZStack {
                RoundedRectangle(cornerRadius: compact ? 8 : 12, style: .continuous)
                    .fill(ReadItTheme.spruce)
                    .frame(width: compact ? 28 : 44, height: compact ? 28 : 44)
                Image(systemName: "text.book.closed.fill")
                    .foregroundStyle(ReadItTheme.parchment)
                    .font(.system(size: compact ? 13 : 20, weight: .semibold))
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("Read It")
                    .font(.system(compact ? .title3 : .largeTitle, design: .serif).weight(.semibold))
                    .foregroundStyle(ReadItTheme.ink)
                if !compact {
                    Text("Grok voice for whatever you highlight")
                        .font(.system(.subheadline, design: .rounded))
                        .foregroundStyle(ReadItTheme.ink.opacity(0.65))
                }
            }
        }
    }
}
