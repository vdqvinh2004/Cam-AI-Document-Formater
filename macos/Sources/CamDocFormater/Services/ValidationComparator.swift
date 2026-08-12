import Foundation

public struct NativeValidationComparator: Sendable {
    public init() {}

    public func compare(source: CanonicalDocument, output: CanonicalDocument, sourceHash: String) -> ValidationResult {
        var issues: [ValidationIssue] = []
        if source.format != output.format { issues.append(.init(category: "format", message: "Output format differs from source.")) }
        if source.blocks.map(whitespaceNormalizedSignature) != output.blocks.map(whitespaceNormalizedSignature) {
            issues.append(.init(category: "content", message: "Text or document structure changed."))
        }
        if normalizedText(source.blocks) != normalizedText(output.blocks) {
            issues.append(.init(category: "content-exactness", message: "Formatted text is not 100% identical to the source."))
        }
        if source.capabilities.unsupportedFeatures != output.capabilities.unsupportedFeatures {
            issues.append(.init(category: "capability", message: "Output contains unsupported document features."))
        }
        return .init(status: issues.isEmpty ? .pass : .fail, sourceHash: sourceHash, issues: issues)
    }

    /// Content signature with presentation (runs, spacing) and whitespace normalized away:
    /// formatting may restructure whitespace freely, but never the words themselves.
    private func whitespaceNormalizedSignature(_ block: BlockNode) -> String {
        switch block {
        case let .paragraph(nodeID, text, _): "paragraph:\(nodeID):\(normalizeText(text))"
        case let .heading(nodeID, level, text, _): "heading:\(nodeID):\(level):\(normalizeText(text))"
        case let .opaque(nodeID, sourceKind, value): "opaque:\(nodeID):\(sourceKind):\(value)"
        }
    }

    /// Order-sensitive token equality with presentation markers stripped: formatting may only
    /// change presentation, never content.
    private func normalizedText(_ blocks: [BlockNode]) -> String {
        blocks.map { block in
            switch block {
            case let .paragraph(_, text, _), let .heading(_, _, text, _): normalizeText(text)
            case let .opaque(_, _, value): value
            }
        }.joined(separator: "\n")
    }

    private func normalizeText(_ text: String) -> String {
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        let cleaned = lines.map { line -> String in
            let headings = line.replacingOccurrences(of: #"^#{1,6}\s+"#, with: "", options: .regularExpression)
            let listMarkers = headings.replacingOccurrences(of: #"^\s*(?:[-*+]|\d+\.)\s+"#, with: "", options: .regularExpression)
            return listMarkers.replacingOccurrences(of: "[*_`]", with: "", options: .regularExpression)
                .split(whereSeparator: \.isWhitespace).joined(separator: " ")
        }
        return cleaned.filter { !$0.isEmpty }.joined(separator: "\n")
    }
}