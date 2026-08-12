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

@Suite("Native DOCX preview contracts")
struct NativeDocxPreviewContractsTests {
    private func fixture(_ name: String) throws -> Data {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        return try Data(contentsOf: root.appendingPathComponent("tests/fixtures/docx/\(name)"))
    }

    @Test func docxPreviewRendersRichFixture() throws {
        let renderer = DocxPreviewRenderer()
        let preview = renderer.render(data: try fixture("sample-rich.docx"))
        #expect(preview.docxStatus == .rendered)
        #expect(preview.available)
        #expect(preview.sourceText.contains("Sample Rich Document"))
        #expect(preview.sourceText.contains("hyperlink"))
        #expect(preview.sourceText.contains("Alpha"))
        #expect(preview.summary.contains("ready"))
        #expect(!preview.docxBlocks.isEmpty)
    }

    @Test func docxPreviewReportsUnsupportedObjectsAsPartial() throws {
        let renderer = DocxPreviewRenderer()
        let preview = renderer.render(data: try fixture("unsupported-object.docx"))
        #expect(preview.docxStatus == .partial)
        #expect(preview.available)
        #expect(preview.featureWarnings == ["Some embedded DOCX objects are not rendered."])
        #expect(preview.summary == "DOCX preview is partial.")
        #expect(preview.sourceText.contains("Text before the object."))
        #expect(preview.sourceText.contains("Text after the object."))
    }

    @Test func docxPreviewFailsClosedOnMalformedPackage() throws {
        let renderer = DocxPreviewRenderer()
        let preview = renderer.render(data: try fixture("malformed-package.docx"))
        #expect([DocxPreviewStatus.unavailable, .failed].contains(preview.docxStatus))
        #expect(!preview.available)
        #expect(preview.sourceText.isEmpty)
        #expect(preview.docxBlocks.isEmpty)
    }

    @Test func emptyDocxIsUnavailableNotRendered() {
        let preview = DocxPreviewRenderer().render(data: Data())
        #expect(preview.docxStatus == .unavailable)
        #expect(!preview.available)
    }

    @Test func docxPreviewCleansUpAllTemporaryResources() throws {
        let workspace = FileManager.default.temporaryDirectory.appendingPathComponent("cam-docx-test-\(UUID().uuidString)")
        let renderer = DocxPreviewRenderer(workspaceDirectory: workspace)
        defer { try? FileManager.default.removeItem(at: workspace) }
        _ = renderer.render(data: try fixture("sample-rich.docx"))
        _ = renderer.render(data: try fixture("unsupported-object.docx"))
        _ = renderer.render(data: try fixture("malformed-package.docx"))
        let leftovers = try FileManager.default.contentsOfDirectory(at: workspace, includingPropertiesForKeys: nil)
        #expect(leftovers.isEmpty)
    }

    @Test func docxPreviewAvailabilityIsIndependentFromValidationGating() throws {
        let source = CanonicalDocument(format: .docx, blocks: [.opaque(nodeID: "doc", sourceKind: "docx", value: "digest")])
        let pass = PreviewModel(source: source, output: source, validation: .init(status: .pass, sourceHash: "h"), docxStatus: .rendered)
        #expect(pass.available)
        #expect(pass.compareAvailable)
        let fail = PreviewModel(source: source, output: source, validation: .init(status: .fail, sourceHash: "h"), docxStatus: .rendered)
        #expect(!fail.available)
        #expect(!fail.compareAvailable)
        // docxStatus still reports a render result regardless of validation gating.
        #expect(fail.docxStatus == .rendered)
    }
}

@Suite("Native exact preservation contracts")
struct NativeExactPreservationTests {
    @Test func presentationOnlyChangesRemainExact() {
        let source = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "A quick brown fox", presentation: .init())])
        let output = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "A quick brown fox", presentation: .init(bold: true, italic: true))])
        let result = NativeValidationComparator().compare(source: source, output: output, sourceHash: "h")
        #expect(result.status == .pass)
    }

    @Test func rewrittenWordFailsExactness() {
        let source = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "The quick brown fox", presentation: .init())])
        let output = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "The quick brown cat", presentation: .init())])
        let result = NativeValidationComparator().compare(source: source, output: output, sourceHash: "h")
        #expect(result.status == .fail)
        #expect(result.issues.contains { $0.category == "content-exactness" })
    }

    @Test func reorderedWordsFailExactness() {
        let source = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "one two three", presentation: .init())])
        let output = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "three two one", presentation: .init())])
        #expect(NativeValidationComparator().compare(source: source, output: output, sourceHash: "h").status == .fail)
    }

    @Test func identicalWordCountWithDifferentWordsFailsExactness() {
        let source = CanonicalDocument(format: .markdown, blocks: [.heading(nodeID: "h0", level: 1, text: "Plan overview", presentation: .init())])
        let output = CanonicalDocument(format: .markdown, blocks: [.heading(nodeID: "h0", level: 1, text: "Project summary", presentation: .init())])
        #expect(NativeValidationComparator().compare(source: source, output: output, sourceHash: "h").status == .fail)
    }

    @Test func whitespaceDiffsRemainExact() {
        let source = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "alpha   beta", presentation: .init())])
        let output = CanonicalDocument(format: .txt, blocks: [.paragraph(nodeID: "p0", text: "alpha beta", presentation: .init())])
        #expect(NativeValidationComparator().compare(source: source, output: output, sourceHash: "h").status == .pass)
    }
}