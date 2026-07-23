public struct NativeSettings: Codable, Sendable, Equatable {
    public var selectedStyle: String
    public var prefersReducedMotion: Bool

    public init(selectedStyle: String = StyleName.modern.rawValue, prefersReducedMotion: Bool = false) {
        self.selectedStyle = selectedStyle
        self.prefersReducedMotion = prefersReducedMotion
    }
}