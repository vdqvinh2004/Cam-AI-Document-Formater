import Foundation

public actor JobCoordinator {
    public private(set) var state: JobState = .created
    public private(set) var snapshot = WorkflowSnapshot()
    private var task: Task<Void, Never>?

    public init() {}

    public func start(profile: FormattingProfile, document: CanonicalDocument, client: any GeminiClient, apiKey: String, disclosureAccepted: Bool, sourceData: Data? = nil, sourceHash: String = "") {
        guard task == nil else { return }
        state = .awaitingConfirmation
        snapshot.phase = .awaitingConfirmation
        snapshot.source = document
        snapshot.sourceData = sourceData
        snapshot.progress = .init(phase: .awaitingConfirmation, fraction: 0.1, message: "Ready to generate.")
        task = Task {
            do {
                guard disclosureAccepted else { throw NativeContractError.missingDisclosure }
                state = .generating
                snapshot.phase = .generating
                snapshot.progress = .init(phase: .generating, fraction: 0.4, message: "Generating formatting plan.")
                let plan = try await client.formattingPlan(for: document, profile: profile, apiKey: apiKey, disclosureAccepted: disclosureAccepted)
                let output = try plan.applying(to: document)
                try Task.checkCancellation()
                state = .validating
                snapshot.phase = .validating
                snapshot.progress = .init(phase: .validating, fraction: 0.8, message: "Checking content preservation.")
                let validation = NativeValidationComparator().compare(source: document, output: output, sourceHash: sourceHash)
                snapshot.validation = validation
                snapshot.outputData = try NativeAdapterRegistry().adapter(for: output.format).serialize(document: output)
                guard validation.status == .pass else { throw NativeContractError.unsafeExport }
                state = .readyToExport
                snapshot.phase = .readyToExport
                snapshot.progress = .init(phase: .readyToExport, fraction: 1, message: "Validated output ready to export.")
            } catch is CancellationError {
                state = .cancelled
                snapshot.phase = .cancelled
                snapshot.progress = .init(phase: .cancelled, fraction: 1, message: "Operation cancelled.")
            } catch {
                state = .failed
                snapshot.phase = .failed
                snapshot.errorMessage = (error as? LocalizedError)?.errorDescription ?? "Operation failed."
                snapshot.progress = .init(phase: .failed, fraction: 1, message: snapshot.errorMessage ?? "Operation failed.")
            }
            task = nil
        }
    }

    public func cancel() {
        task?.cancel()
        task = nil
        state = .cancelled
        snapshot.phase = .cancelled
        snapshot.progress = .init(phase: .cancelled, fraction: 1, message: "Operation cancelled.")
    }
}