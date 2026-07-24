import Foundation

public struct PlainTextAdapter: DocumentAdapter, Sendable {
    public let format: DocumentFormat = .txt

    public init() {}

    public func extract(data: Data) throws -> CanonicalDocument {
        guard let text = String(data: data, encoding: .utf8) else { throw NativeServiceError.invalidSource }
        let blocks = text.components(separatedBy: .newlines).enumerated().map { index, line in
            BlockNode.paragraph(nodeID: "p\(index)", text: line, presentation: .init())
        }
        return CanonicalDocument(format: .txt, blocks: blocks)
    }

    public func serialize(document: CanonicalDocument) throws -> Data {
        Data(document.blocks.map { block in
            switch block {
            case let .paragraph(_, text, _), let .heading(_, _, text, _): text
            case let .opaque(_, _, value): value
            }
        }.joined(separator: "\n").utf8)
    }
}

public struct MarkdownAdapter: DocumentAdapter, Sendable {
    public let format: DocumentFormat = .markdown

    public init() {}

    public func extract(data: Data) throws -> CanonicalDocument {
        guard let text = String(data: data, encoding: .utf8) else { throw NativeServiceError.invalidSource }
        let blocks = text.components(separatedBy: .newlines).enumerated().map { index, line in
            let heading = line.prefix(while: { $0 == "#" }).count
            if heading > 0, line.dropFirst(heading).first == " " {
                return BlockNode.heading(nodeID: "h\(index)", level: min(heading, 6), text: String(line.dropFirst(heading + 1)), presentation: .init())
            }
            return BlockNode.paragraph(nodeID: "p\(index)", text: line, presentation: .init())
        }
        return CanonicalDocument(format: .markdown, blocks: blocks)
    }

    public func serialize(document: CanonicalDocument) throws -> Data {
        Data(document.blocks.map { block in
            switch block {
            case let .heading(_, level, text, presentation): "\(String(repeating: "#", count: level)) \(markdownPresentation(presentation, text))"
            case let .paragraph(_, text, presentation): markdownPresentation(presentation, text)
            case let .opaque(_, _, text): text
            }
        }.joined(separator: "\n").utf8)
    }

    private func markdownPresentation(_ presentation: Presentation, _ text: String) -> String {
        if presentation.bold == true && presentation.italic == true { return "***\(text)***" }
        if presentation.bold == true { return "**\(text)**" }
        if presentation.italic == true { return "*\(text)*" }
        return text
    }
}

public struct UnsupportedDocumentAdapter: DocumentAdapter, Sendable {
    public let format: DocumentFormat
    public init(format: DocumentFormat) { self.format = format }
    public func extract(data: Data) throws -> CanonicalDocument { throw NativeServiceError.invalidSource }
    public func serialize(document: CanonicalDocument) throws -> Data { throw NativeContractError.invalidPlan("Unsupported format capability") }
}

public struct PackageDocumentAdapter: DocumentAdapter, Sendable {
    public let format: DocumentFormat

    public init(format: DocumentFormat) { self.format = format }

    public func extract(data: Data) throws -> CanonicalDocument {
        guard !data.isEmpty else { throw NativeFileAccessError.emptyFile }
        switch format {
        case .docx:
            guard data.starts(with: [0x50, 0x4B]) else { throw NativeServiceError.invalidSource }
        case .pdf:
            guard data.starts(with: Array("%PDF-".utf8)) else { throw NativeServiceError.invalidSource }
        default:
            throw NativeFileAccessError.unsupportedFormat
        }
        return CanonicalDocument(format: format, blocks: [.opaque(nodeID: "document", sourceKind: format.rawValue, value: data.base64EncodedString())], capabilities: .init(text: true, images: true, tables: true, hyperlinks: true, structure: true))
    }

    public func serialize(document: CanonicalDocument) throws -> Data {
        guard document.format == format, let block = document.blocks.first, case let .opaque(_, _, digest) = block else { throw NativeContractError.invalidPlan("Unsupported document representation") }
        guard let data = Data(base64Encoded: digest) else { throw NativeContractError.invalidPlan("Corrupt document payload") }
        return data
    }
}

public struct NativeAdapterRegistry: Sendable {
    public init() {}

    public func adapter(for format: DocumentFormat) -> any DocumentAdapter {
        switch format {
        case .txt: PlainTextAdapter()
        case .markdown: MarkdownAdapter()
        case .docx, .pdf: PackageDocumentAdapter(format: format)
        }
    }
}