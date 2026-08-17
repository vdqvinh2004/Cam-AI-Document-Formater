#if canImport(SwiftUI)
import SwiftUI

/// Token-driven design system shared across all SwiftUI views.
/// Mirrors the SaaS (General) palette from ui-ux-pro-max official data.
enum NativeDesignSystem {
    // MARK: - Layout
    static let minimumWindow = CGSize(width: 900, height: 620)
    static let contentSpacing: CGFloat = 20
    static let panelPadding: CGFloat = 20
    static let cornerRadius: CGFloat = 8
    static let controlCornerRadius: CGFloat = 6

    // MARK: - Spacing scale (4pt base)
    enum Spacing {
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Typography (Plus Jakarta Sans family)
    enum Typography {
        static let title: Font = .system(size: 28, weight: .bold, design: .default)
        static let heading: Font = .system(size: 20, weight: .semibold, design: .default)
        static let subheading: Font = .system(size: 16, weight: .medium)
        static let body: Font = .system(size: 14, weight: .regular)
        static let caption: Font = .caption
        static let footnote: Font = .footnote
    }

    // MARK: - Semantic colors (light/dark adaptive, SaaS palette)
    enum Color {
        // Light mode (SaaS General)
        static let lightBackground = SwiftUI.Color(red: 248/255, green: 250/255, blue: 252/255)      // #F8FAFC
        static let lightForeground = SwiftUI.Color(red: 30/255, green: 41/255, blue: 59/255)          // #1E293B
        static let lightCard = SwiftUI.Color(red: 1.0, green: 1.0, blue: 1.0)                         // #FFFFFF
        static let lightCardForeground = SwiftUI.Color(red: 30/255, green: 41/255, blue: 59/255)      // #1E293B
        static let lightPrimary = SwiftUI.Color(red: 37/255, green: 99/255, blue: 235/255)           // #2563EB
        static let lightPrimaryForeground = SwiftUI.Color(red: 1.0, green: 1.0, blue: 1.0)            // #FFFFFF
        static let lightSecondary = SwiftUI.Color(red: 226/255, green: 232/255, blue: 240/255)       // #E2E8F0
        static let lightSecondaryForeground = SwiftUI.Color(red: 30/255, green: 41/255, blue: 59/255) // #1E293B
        static let lightMuted = SwiftUI.Color(red: 233/255, green: 239/255, blue: 248/255)           // #E9EFF8
        static let lightMutedForeground = SwiftUI.Color(red: 71/255, green: 85/255, blue: 105/255)    // #475569
        static let lightAccent = SwiftUI.Color(red: 234/255, green: 88/255, blue: 12/255)            // #EA580C
        static let lightAccentForeground = SwiftUI.Color(red: 1.0, green: 1.0, blue: 1.0)             // #FFFFFF
        static let lightDestructive = SwiftUI.Color(red: 220/255, green: 38/255, blue: 38/255)        // #DC2626
        static let lightDestructiveForeground = SwiftUI.Color(red: 1.0, green: 1.0, blue: 1.0)        // #FFFFFF
        static let lightBorder = SwiftUI.Color(red: 226/255, green: 232/255, blue: 240/255)          // #E2E8F0
        static let lightRing = SwiftUI.Color(red: 37/255, green: 99/255, blue: 235/255)              // #2563EB
        static let lightWarning = SwiftUI.Color(red: 237/255, green: 157/255, blue: 37/255)          // #ED9D25 (adjusted)

        // Dark mode
        static let darkBackground = SwiftUI.Color(red: 17/255, green: 24/255, blue: 39/255)           // #111827 ~ 217 33% 11%
        static let darkForeground = SwiftUI.Color(red: 248/255, green: 250/255, blue: 252/255)        // #F8FAFC
        static let darkCard = SwiftUI.Color(red: 17/255, green: 24/255, blue: 39/255)                // #111827
        static let darkCardForeground = SwiftUI.Color(red: 248/255, green: 250/255, blue: 252/255)    // #F8FAFC
        static let darkPrimary = SwiftUI.Color(red: 59/255, green: 130/255, blue: 246/255)           // #3B82F6 (lighter for dark mode)
        static let darkPrimaryForeground = SwiftUI.Color(red: 17/255, green: 24/255, blue: 39/255)    // #111827
        static let darkSecondary = SwiftUI.Color(red: 30/255, green: 41/255, blue: 59/255)           // #1E293B
        static let darkSecondaryForeground = SwiftUI.Color(red: 248/255, green: 250/255, blue: 252/255) // #F8FAFC
        static let darkMuted = SwiftUI.Color(red: 30/255, green: 41/255, blue: 59/255)               // #1E293B
        static let darkMutedForeground = SwiftUI.Color(red: 148/255, green: 163/255, blue: 184/255)   // #94A3B8
        static let darkAccent = SwiftUI.Color(red: 251/255, green: 113/255, blue: 18/255)            // #FB7112 (adjusted for dark)
        static let darkAccentForeground = SwiftUI.Color(red: 248/255, green: 250/255, blue: 252/255)  // #F8FAFC
        static let darkDestructive = SwiftUI.Color(red: 239/255, green: 68/255, blue: 68/255)        // #EF4444
        static let darkDestructiveForeground = SwiftUI.Color(red: 248/255, green: 250/255, blue: 252/255) // #F8FAFC
        static let darkBorder = SwiftUI.Color(red: 30/255, green: 41/255, blue: 59/255)              // #1E293B
        static let darkRing = SwiftUI.Color(red: 96/255, green: 165/255, blue: 250/255)              // #60A5FA
        static let darkWarning = SwiftUI.Color(red: 250/255, green: 171/255, blue: 41/255)           // #FAAB29
    }

    // MARK: - Shadows
    static let cardShadowColor = SwiftUI.Color.black.opacity(0.1)
    static let cardShadowRadius: CGFloat = 8
    static let cardShadowY: CGFloat = 2
}
#endif