import Foundation

public struct PreviewModel: Equatable, Sendable {
    public let source: CanonicalDocument
    public let output: CanonicalDocument
    public let validation: ValidationResult

    public init?(source: CanonicalDocument, output: CanonicalDocument, validation: ValidationResult) {
        guard validation.status == .pass else { return nil }
        self.source = source
        self.output = output
        self.validation = validation
    }

    public var changedNodeIDs: [String] {
        zip(source.blocks, output.blocks).compactMap { sourceBlock, outputBlock in
            sourceBlock.contentSignature == outputBlock.contentSignature && sourceBlock != outputBlock ? sourceBlock.nodeID : nil
        }
    }
}
