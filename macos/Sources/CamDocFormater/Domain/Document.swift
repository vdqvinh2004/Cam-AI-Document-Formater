import Foundation

public enum DocumentFormat: String, Codable, Sendable, CaseIterable {
    case txt
    case markdown
    case docx
    case pdf
}

public struct FormatCapabilities: Codable, Equatable, Sendable {
    public var text: Bool
    public var images: Bool
    public var tables: Bool
    public var hyperlinks: Bool
    public var structure: Bool
    public var unsupportedFeatures: [String]

    public init(text: Bool = true, images: Bool = false, tables: Bool = false, hyperlinks: Bool = false, structure: Bool = true, unsupportedFeatures: [String] = []) {
        self.text = text
        self.images = images
        self.tables = tables
        self.hyperlinks = hyperlinks
        self.structure = structure
        self.unsupportedFeatures = unsupportedFeatures
    }
}

public struct Presentation: Codable, Equatable, Sendable {
    public var fontFamily: String?
    public var fontSize: Double?
    public var bold: Bool?
    public var italic: Bool?
    public var alignment: String?
    public var spacingAfter: Double?
    public var lineSpacing: Double?

    public init(fontFamily: String? = nil, fontSize: Double? = nil, bold: Bool? = nil, italic: Bool? = nil, alignment: String? = nil, spacingAfter: Double? = nil, lineSpacing: Double? = nil) {
        self.fontFamily = fontFamily
        self.fontSize = fontSize
        self.bold = bold
        self.italic = italic
        self.alignment = alignment
        self.spacingAfter = spacingAfter
        self.lineSpacing = lineSpacing
    }
}

public struct TextInline: Codable, Equatable, Sendable {
    public let nodeID: String
    public let value: String
    public var presentation: Presentation

    public init(nodeID: String, value: String, presentation: Presentation = .init()) {
        self.nodeID = nodeID
        self.value = value
        self.presentation = presentation
    }
}

public enum BlockNode: Codable, Equatable, Sendable {
    case paragraph(nodeID: String, text: String, presentation: Presentation)
    case heading(nodeID: String, level: Int, text: String, presentation: Presentation)
    case opaque(nodeID: String, sourceKind: String, value: String)

    public var nodeID: String {
        switch self {
        case let .paragraph(nodeID, _, _), let .heading(nodeID, _, _, _), let .opaque(nodeID, _, _): nodeID
        }
    }

    public var contentSignature: String {
        switch self {
        case let .paragraph(_, text, _): "paragraph:\(text)"
        case let .heading(_, level, text, _): "heading:\(level):\(text)"
        case let .opaque(_, sourceKind, value): "opaque:\(sourceKind):\(value)"
        }
    }
}

public struct CanonicalDocument: Codable, Equatable, Sendable {
    public let documentID: String
    public let format: DocumentFormat
    public var blocks: [BlockNode]
    public var capabilities: FormatCapabilities
    public var presentation: Presentation

    public init(documentID: String = UUID().uuidString, format: DocumentFormat, blocks: [BlockNode], capabilities: FormatCapabilities = .init(), presentation: Presentation = .init()) {
        self.documentID = documentID
        self.format = format
        self.blocks = blocks
        self.capabilities = capabilities
        self.presentation = presentation
    }
}