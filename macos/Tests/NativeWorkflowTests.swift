import Foundation
import Testing
@testable import CamDocFormater

@Suite("Native workflow contracts")
struct NativeWorkflowTests {
    struct MockGemini: GeminiClient {
        func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
            guard disclosureAccepted else { throw NativeContractError.missingDisclosure }
            return FormattingPlan(operations: document.blocks.map { .setPresentation(nodeID: $0.nodeID, presentation: .init(bold: true)) })
        }
    }

    @Test func allFormatAdaptersPreserveSupportedBytes() throws {
        let cases: [(DocumentFormat, Data)] = [
            (.txt, Data("one\ntwo".utf8)),
            (.markdown, Data("# heading\nbody".utf8)),
            (.docx, Data([0x50, 0x4B, 0x03, 0x04, 0x01])),
            (.pdf, Data("%PDF-1.7\nsource".utf8))
        ]
        for (format, data) in cases {
            let adapter = NativeAdapterRegistry().adapter(for: format)
            let document = try adapter.extract(data: data)
            #expect(try adapter.serialize(document: document) == data)
        }
    }

    @Test func coordinatorReachesReadyStateWithValidation() async throws {
        let data = Data("source".utf8)
        let document = try PlainTextAdapter().extract(data: data)
        let coordinator = JobCoordinator()
        await coordinator.start(profile: .init(style: .modern), document: document, client: MockGemini(), apiKey: "test", disclosureAccepted: true, sourceData: data, sourceHash: data.map { String(format: "%02x", $0) }.joined())
        for _ in 0..<100 where await coordinator.state != .readyToExport { await Task.yield() }
        #expect(await coordinator.state == .readyToExport)
        #expect(await coordinator.snapshot.validation?.status == .pass)
        #expect(await coordinator.snapshot.outputData == data)
    }

    @Test func instructionsRejectContentChanges() {
        let result = InstructionPolicy().screen("rewrite this and improve grammar")
        #expect(result.accepted == nil)
        #expect(result.warning != nil)
    }

    @Test func packageAdapterRejectsInvalidSignatures() {
        #expect(throws: NativeServiceError.invalidSource) { try PackageDocumentAdapter(format: .pdf).extract(data: Data("not pdf".utf8)) }
    }

    private static func fixtureBytes(_ name: String) throws -> Data {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        return try Data(contentsOf: root.appendingPathComponent("tests/fixtures/docx/\(name)"))
    }

    @Test func docxPreservedThroughFullWorkflowCycle() async throws {
        let data = try Self.fixtureBytes("sample-rich.docx")
        let document = try PackageDocumentAdapter(format: .docx).extract(data: data)
        let coordinator = JobCoordinator()
        await coordinator.start(profile: .init(style: .modern), document: document, client: MockGemini(), apiKey: "test", disclosureAccepted: true, sourceData: data, sourceHash: data.map { String(format: "%02x", $0) }.joined())
        for _ in 0..<100 where await coordinator.state != .readyToExport { await Task.yield() }
        #expect(await coordinator.state == .readyToExport)
        #expect(await coordinator.snapshot.validation?.status == .pass)
        #expect(await coordinator.snapshot.outputData == data)
    }

    @Test func cancellationReachesCancelledState() async throws {
        struct PendingGemini: GeminiClient {
            func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
                try await Task.sleep(for: .milliseconds(100))
                return FormattingPlan(operations: [])
            }
        }
        let coordinator = JobCoordinator()
        await coordinator.start(profile: .init(style: .simple), document: .init(format: .txt, blocks: []), client: PendingGemini(), apiKey: "test", disclosureAccepted: true)
        await coordinator.cancel()
        for _ in 0..<50 where await coordinator.state != .cancelled { await Task.yield() }
        #expect(await coordinator.state == .cancelled)
        #expect(await coordinator.snapshot.phase == .cancelled)
    }
}
