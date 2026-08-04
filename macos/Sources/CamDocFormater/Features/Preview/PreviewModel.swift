import Foundation

public struct PreviewDiffRow: Equatable, Sendable {
    public let line: Int
    public let before: String
    public let after: String

    public init(line: Int, before: String, after: String) {
        self.line = line
        self.before = before
        self.after = after
    }
}

public enum PreviewMode: String, CaseIterable, Sendable {
    case source
    case result
    case compare
}

public enum DocxPreviewStatus: String, Equatable, Sendable {
    case rendered
    case partial
    case unavailable
    case failed
}

public struct DocxPreviewBlock: Equatable, Sendable {
    public let index: Int
    public let text: String
    public let isHeading: Bool

    public init(index: Int, text: String, isHeading: Bool = false) {
        self.index = index
        self.text = text
        self.isHeading = isHeading
    }
}

public struct PreviewModel: Equatable, Sendable {
    public let available: Bool
    public let summary: String
    public let sourceText: String
    public let outputText: String
    public let diffs: [PreviewDiffRow]
    public let docxStatus: DocxPreviewStatus?
    public let docxBlocks: [DocxPreviewBlock]
    public let featureWarnings: [String]
    public let compareAvailable: Bool

    public init(source: CanonicalDocument?, output: CanonicalDocument?, validation: ValidationResult?, available: Bool = true, docxStatus: DocxPreviewStatus? = nil, featureWarnings: [String] = []) {
        let sourceText = source?.blocks.map(
            { block in
                switch block {
                case let .paragraph(_, text, _): text
                case let .heading(_, _, text, _): text
                case let .opaque(_, _, value): value
                }
            }
        ).joined(separator: "\n") ?? ""
        let outputText = output?.blocks.map(
            { block in
                switch block {
                case let .paragraph(_, text, _): text
                case let .heading(_, _, text, _): text
                case let .opaque(_, _, value): value
                }
            }
        ).joined(separator: "\n") ?? ""
        let summary: String
        if let validation {
            switch validation.status {
            case .pass: summary = "Preview ready. Validation passed."
            case .fail: summary = "Preview unavailable until validation passes."
            case .inconclusive: summary = "Preview unavailable because validation is inconclusive."
            }
        } else {
            summary = available ? "Preview ready for the current document." : "Preview unavailable for this format."
        }
        self.available = available && (validation?.status == .pass || validation == nil)
        self.summary = summary
        self.sourceText = sourceText
        self.outputText = outputText
        self.diffs = PreviewModel.diffLines(from: sourceText, to: outputText)
        self.docxStatus = docxStatus
        self.docxBlocks = docxStatus == nil ? [] : sourceText.split(separator: "\n", omittingEmptySubsequences: false).enumerated().map { DocxPreviewBlock(index: $0.offset, text: String($0.element)) }
        self.featureWarnings = featureWarnings
        self.compareAvailable = available && (validation?.status == .pass || validation == nil)
    }

    public init(sourceText: String, outputText: String, available: Bool, summary: String, docxStatus: DocxPreviewStatus? = nil, docxBlocks: [DocxPreviewBlock] = [], featureWarnings: [String] = []) {
        self.available = available
        self.summary = summary
        self.sourceText = sourceText
        self.outputText = outputText
        self.diffs = PreviewModel.diffLines(from: sourceText, to: outputText)
        self.docxStatus = docxStatus
        self.docxBlocks = docxBlocks
        self.featureWarnings = featureWarnings
        self.compareAvailable = available
    }

    private static func diffLines(from source: String, to output: String) -> [PreviewDiffRow] {
        let sourceLines = source.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        let outputLines = output.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        let maxLines = max(sourceLines.count, outputLines.count)
        var diffs: [PreviewDiffRow] = []
        for index in 0..<maxLines {
            let before = sourceLines.indices.contains(index) ? sourceLines[index] : ""
            let after = outputLines.indices.contains(index) ? outputLines[index] : ""
            if before != after {
                diffs.append(.init(line: index + 1, before: before, after: after))
            }
        }
        return diffs
    }
}
