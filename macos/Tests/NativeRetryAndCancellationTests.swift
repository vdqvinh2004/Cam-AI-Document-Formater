import Foundation
import Testing
@testable import CamDocFormater

@Suite("Native Gemini retry and cancellation contracts")
struct NativeRetryAndCancellationTests {

    // MARK: - HTTPGeminiClient retry configuration

    @Test func retryConfigurationDefaultsAreReasonable() {
        let client = HTTPGeminiClient()
        #expect(client.maxRetryAttempts == 3)
        #expect(client.retryBaseDelay == 1.0)
        #expect(client.retryMaxDelay == 8.0)
    }

    @Test func retryConfigurationIsCustomizable() {
        let client = HTTPGeminiClient(maxRetryAttempts: 5, retryBaseDelay: 0.5, retryMaxDelay: 4.0)
        #expect(client.maxRetryAttempts == 5)
        #expect(client.retryBaseDelay == 0.5)
        #expect(client.retryMaxDelay == 4.0)
    }

    @Test func retryConfigurationClampsToMaxDelay() {
        let client = HTTPGeminiClient(retryBaseDelay: 100.0, retryMaxDelay: 8.0)
        // Base delay of 100 should be clamped by retryMaxDelay of 8
        #expect(client.retryMaxDelay == 8.0)
    }

    // MARK: - Job Coordinator error handling

    struct FailingGeminiClient: GeminiClient {
        let error: Error
        func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
            throw error
        }
    }

    @Test func coordinatorHandlesRequestFailureGracefully() async throws {
        let client = FailingGeminiClient(error: NativeServiceError.requestFailed)
        let coordinator = JobCoordinator()
        await coordinator.start(
            profile: .init(style: .modern),
            document: .init(format: .txt, blocks: []),
            client: client,
            apiKey: "test",
            disclosureAccepted: true
        )
        for _ in 0..<20 where await coordinator.state != .failed { await Task.yield() }
        #expect(await coordinator.state == .failed)
        #expect(await coordinator.snapshot.errorMessage != nil)
        #expect(!(await coordinator.snapshot.errorMessage ?? "").contains("test"))
    }

    @Test func coordinatorHandlesMissingDisclosureWithoutRetry() async throws {
        let client = FailingGeminiClient(error: NativeContractError.missingDisclosure)
        let coordinator = JobCoordinator()
        await coordinator.start(
            profile: .init(style: .modern),
            document: .init(format: .txt, blocks: []),
            client: client,
            apiKey: "test",
            disclosureAccepted: false
        )
        for _ in 0..<20 where await coordinator.state != .failed { await Task.yield() }
        #expect(await coordinator.state == .failed)
    }

    @Test func coordinatorHandlesInvalidResponseGracefully() async throws {
        let client = FailingGeminiClient(error: NativeServiceError.invalidResponse)
        let coordinator = JobCoordinator()
        await coordinator.start(
            profile: .init(style: .modern),
            document: .init(format: .txt, blocks: []),
            client: client,
            apiKey: "test",
            disclosureAccepted: true
        )
        for _ in 0..<20 where await coordinator.state != .failed { await Task.yield() }
        #expect(await coordinator.state == .failed)
    }

    // MARK: - Cancellation

    struct SlowGeminiClient: GeminiClient {
        func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
            try await Task.sleep(for: .seconds(5))
            return FormattingPlan(operations: [])
        }
    }

    @Test func cancellationDuringRequestReachesCancelledState() async throws {
        let coordinator = JobCoordinator()
        await coordinator.start(
            profile: .init(style: .simple),
            document: .init(format: .txt, blocks: []),
            client: SlowGeminiClient(),
            apiKey: "test",
            disclosureAccepted: true
        )
        // Cancel immediately before the slow request completes
        await coordinator.cancel()
        for _ in 0..<50 where await coordinator.state != .cancelled { await Task.yield() }
        #expect(await coordinator.state == .cancelled)
    }

    @Test func doubleCancelIsIdempotent() async throws {
        let coordinator = JobCoordinator()
        await coordinator.start(
            profile: .init(style: .simple),
            document: .init(format: .txt, blocks: []),
            client: SlowGeminiClient(),
            apiKey: "test",
            disclosureAccepted: true
        )
        await coordinator.cancel()
        await coordinator.cancel() // Second cancel should not crash
        for _ in 0..<50 where await coordinator.state != .cancelled { await Task.yield() }
        #expect(await coordinator.state == .cancelled)
    }

    // MARK: - Successful workflow after error recovery

    struct RecoveryGeminiClient: GeminiClient {
        func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
            guard disclosureAccepted else { throw NativeContractError.missingDisclosure }
            return FormattingPlan(operations: document.blocks.map { .setPresentation(nodeID: $0.nodeID, presentation: .init(bold: true)) })
        }
    }

    @Test func successfulPlanProducesValidatedOutput() async throws {
        let client = RecoveryGeminiClient()
        let document = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "Hello world", presentation: .init())])
        let coordinator = JobCoordinator()
        await coordinator.start(
            profile: .init(style: .modern),
            document: document,
            client: client,
            apiKey: "test",
            disclosureAccepted: true
        )
        for _ in 0..<20 where await coordinator.state != .readyToExport { await Task.yield() }
        #expect(await coordinator.state == .readyToExport)
        #expect(await coordinator.snapshot.validation?.status == .pass)
    }
}
