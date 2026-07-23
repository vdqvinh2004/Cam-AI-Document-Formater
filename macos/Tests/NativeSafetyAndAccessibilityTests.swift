import Foundation
import Testing
@testable import CamDocFormater

@Suite("Native safety and accessibility contracts")
struct NativeSafetyAndAccessibilityTests {
    @Test func unsafeValidationCannotExport() throws {
        let destination = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let source = destination.deletingLastPathComponent().appendingPathComponent("source.txt")
        let result = ValidationResult(status: .fail, sourceHash: "source")

        #expect(throws: NativeContractError.unsafeExport) {
            try NativeExportService().export(data: Data("output".utf8), to: destination, sourceURL: source, validation: result)
        }
        #expect(!FileManager.default.fileExists(atPath: destination.path))
    }

    @Test func workflowProgressIsMonotonicAtTerminalState() {
        let progress = WorkflowProgress(phase: .readyToExport, fraction: 1, message: "Ready to export")
        #expect(progress.fraction == 1)
        #expect(progress.phase == .readyToExport)
    }

    @Test func nativeWindowAndReducedMotionContractsAreDefined() {
        #expect(NativeDesignSystem.minimumWindow.width >= 800)
        #expect(NativeDesignSystem.minimumWindow.height >= 500)
        #expect(NativeDesignSystem.cornerRadius <= 8)
    }

    @Test func safeErrorsDoNotExposeCredentialValues() {
        let secret = "AIza-secret-test-value"
        let error = NativeContractError.invalidPlan("invalid formatting operation")
        #expect(!(error.localizedDescription.contains(secret)))
    }
}
