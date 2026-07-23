import Foundation

public struct InstructionPolicy: Sendable {
    public static let maximumLength = 2_000
    private let blockedTerms = ["rewrite", "reword", "add content", "remove content", "delete", "merge paragraphs", "split paragraphs", "rename", "summarize"]

    public init() {}

    public func screen(_ instructions: String?) -> (accepted: String?, warning: String?) {
        guard let instructions else { return (nil, nil) }
        let bounded = String(instructions.prefix(Self.maximumLength)).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !bounded.isEmpty else { return (nil, nil) }
        let lowercased = bounded.lowercased()
        if blockedTerms.contains(where: lowercased.contains) {
            return (nil, "Only presentation changes are supported. Content-changing instructions were ignored.")
        }
        return (bounded, nil)
    }
}