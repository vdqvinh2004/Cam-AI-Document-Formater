import Foundation

public struct NativeValidationComparator: Sendable {
    public init() {}

    public func compare(source: CanonicalDocument, output: CanonicalDocument, sourceHash: String) -> ValidationResult {
        var issues: [ValidationIssue] = []
        if source.format != output.format { issues.append(.init(category: "format", message: "Output format differs from source.")) }
        if source.blocks.map(\.contentSignature) != output.blocks.map(\.contentSignature) {
            issues.append(.init(category: "content", message: "Text or document structure changed."))
        }
        if source.capabilities.unsupportedFeatures != output.capabilities.unsupportedFeatures {
            issues.append(.init(category: "capability", message: "Output contains unsupported document features."))
        }
        return .init(status: issues.isEmpty ? .pass : .fail, sourceHash: sourceHash, issues: issues)
    }
}