import Foundation
import Testing
@testable import CamDocFormater

@Suite("Native preservation contracts")
struct NativeContractsTests {
    struct MockGemini: GeminiClient {
        func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
            guard disclosureAccepted else { throw NativeContractError.missingDisclosure }
            return FormattingPlan(operations: [])
        }
    }

    @Test func planCannotReferenceUnknownNode() {
        let document = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p1", text: "Original", presentation: .init())])
        let plan = FormattingPlan(operations: [.setPresentation(nodeID: "missing", presentation: .init(bold: true))])
        #expect(throws: NativeContractError.invalidPlan("Unknown node reference")) { try plan.validated(against: document) }
    }

    @Test func presentationPlanPreservesContentSignature() throws {
        let document = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p1", text: "Original", presentation: .init())])
        let plan = FormattingPlan(operations: [.setPresentation(nodeID: "p1", presentation: .init(bold: true))])
        let validated = try plan.validated(against: document)
        #expect(validated.operations.count == 1)
        #expect(document.blocks.map(\.contentSignature) == ["paragraph:Original"])
    }

    @Test func textAdapterRoundTripsContent() throws {
        let adapter = PlainTextAdapter()
        let document = try adapter.extract(data: Data("One\nTwo".utf8))
        #expect(String(data: try adapter.serialize(document: document), encoding: .utf8) == "One\nTwo")
    }

    @Test func unsupportedRichFormatsFailClosed() {
        #expect(throws: NativeServiceError.invalidSource) { try UnsupportedDocumentAdapter(format: .pdf).extract(data: Data([1, 2, 3])) }
    }

    @Test func unsafeValidationDoesNotPermitExport() {
        #expect(ValidationResult(status: .fail, sourceHash: "hash").status != .pass)
        #expect(ValidationResult(status: .inconclusive, sourceHash: "hash").status != .pass)
    }

    @Test func safeErrorsDoNotContainSecrets() {
        let error = NativeContractError.missingDisclosure.localizedDescription
        #expect(!error.contains("api"))
        #expect(!error.contains("Original"))
    }

    @Test func jobCoordinatorReachesReadyState() async {
        let coordinator = JobCoordinator()
        await coordinator.start(profile: .init(style: .simple), document: .init(format: .txt, blocks: []), client: MockGemini(), apiKey: "test", disclosureAccepted: true)
        for _ in 0..<20 where await coordinator.state != .readyToExport { await Task.yield() }
        #expect(await coordinator.state == .readyToExport)
    }

    @Test func jobCoordinatorRejectsMissingDisclosure() async {
        let coordinator = JobCoordinator()
        await coordinator.start(profile: .init(style: .simple), document: .init(format: .txt, blocks: []), client: MockGemini(), apiKey: "test", disclosureAccepted: false)
        for _ in 0..<20 where await coordinator.state != .failed { await Task.yield() }
        #expect(await coordinator.state == .failed)
    }
}