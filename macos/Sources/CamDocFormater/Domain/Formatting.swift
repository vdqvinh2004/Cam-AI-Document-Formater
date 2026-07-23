import Foundation

public enum StyleName: String, Codable, CaseIterable, Sendable {
    case simple
    case modern
    case professional
    case easyToRead = "easy-to-read"
    case academic
    case custom
}

public struct FormattingProfile: Codable, Equatable, Sendable {
    public var style: StyleName
    public var instructions: String?

    public init(style: StyleName, instructions: String? = nil) {
        self.style = style
        self.instructions = instructions
    }
}

public enum FormattingOperation: Codable, Equatable, Sendable {
    case setPresentation(nodeID: String, presentation: Presentation)

    private enum CodingKeys: String, CodingKey { case kind, nodeID, presentation }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard try container.decode(String.self, forKey: .kind) == "set-presentation" else { throw NativeContractError.invalidPlan("Unknown operation") }
        self = .setPresentation(nodeID: try container.decode(String.self, forKey: .nodeID), presentation: try container.decode(Presentation.self, forKey: .presentation))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case let .setPresentation(nodeID, presentation):
            try container.encode("set-presentation", forKey: .kind)
            try container.encode(nodeID, forKey: .nodeID)
            try container.encode(presentation, forKey: .presentation)
        }
    }
}

public struct FormattingPlan: Codable, Equatable, Sendable {
    public let version: Int
    public let operations: [FormattingOperation]
    public let warnings: [String]

    public init(version: Int = 1, operations: [FormattingOperation], warnings: [String] = []) {
        self.version = version
        self.operations = operations
        self.warnings = warnings
    }

    public func validated(against document: CanonicalDocument) throws -> FormattingPlan {
        guard version == 1 else { throw NativeContractError.invalidPlan("Unsupported plan version") }
        let IDs = Set(document.blocks.map(\.nodeID))
        for operation in operations {
            if case let .setPresentation(nodeID, _) = operation, !IDs.contains(nodeID) { throw NativeContractError.invalidPlan("Unknown node reference") }
        }
        return self
    }

    public func applying(to document: CanonicalDocument) throws -> CanonicalDocument {
        _ = try validated(against: document)
        var result = document
        for operation in operations {
            guard case let .setPresentation(nodeID, presentation) = operation else { continue }
            result.blocks = result.blocks.map { block in
                switch block {
                case let .paragraph(id, text, _) where id == nodeID:
                    return .paragraph(nodeID: id, text: text, presentation: presentation)
                case let .heading(id, level, text, _) where id == nodeID:
                    return .heading(nodeID: id, level: level, text: text, presentation: presentation)
                default:
                    return block
                }
            }
        }
        return result
    }
}

public enum ValidationStatus: String, Codable, Sendable { case pass, fail, inconclusive }

public struct ValidationIssue: Codable, Equatable, Sendable {
    public let category: String
    public let message: String
    public let nodeID: String?

    public init(category: String, message: String, nodeID: String? = nil) {
        self.category = category
        self.message = message
        self.nodeID = nodeID
    }
}

public struct ValidationResult: Codable, Equatable, Sendable {
    public let status: ValidationStatus
    public let sourceHash: String
    public let issues: [ValidationIssue]

    public init(status: ValidationStatus, sourceHash: String, issues: [ValidationIssue] = []) {
        self.status = status
        self.sourceHash = sourceHash
        self.issues = issues
    }
}

public enum JobState: String, Codable, Sendable { case created, sourceLoaded, awaitingConfirmation, generating, validating, readyToExport, exported, failed, cancelled }

public enum NativeContractError: Error, LocalizedError, Equatable, Sendable {
    case invalidPlan(String)
    case unsafeExport
    case missingDisclosure

    public var errorDescription: String? {
        switch self {
        case let .invalidPlan(message): "Formatting plan rejected: \(message)"
        case .unsafeExport: "Export blocked until validation passes."
        case .missingDisclosure: "Network disclosure is required before generation."
        }
    }
}