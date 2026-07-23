import Foundation

public enum WorkflowPhase: String, Sendable {
    case idle, loading, awaitingConfirmation, generating, validating, readyToExport, exported, failed, cancelled
}

public struct WorkflowProgress: Equatable, Sendable {
    public let phase: WorkflowPhase
    public let fraction: Double
    public let message: String

    public init(phase: WorkflowPhase, fraction: Double, message: String) {
        self.phase = phase
        self.fraction = fraction
        self.message = message
    }
}

public struct WorkflowSnapshot: Equatable, Sendable {
    public var phase: WorkflowPhase = .idle
    public var progress = WorkflowProgress(phase: .idle, fraction: 0, message: "Select a document to begin.")
    public var source: CanonicalDocument?
    public var sourceData: Data?
    public var outputData: Data?
    public var validation: ValidationResult?
    public var errorMessage: String?

    public init() {}
}