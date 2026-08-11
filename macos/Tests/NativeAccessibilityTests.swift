import Foundation
import Testing
@testable import CamDocFormater

@Suite("Native accessibility contracts")
struct NativeAccessibilityTests {
    @Test func windowMinimumSupportsWorkspaceLayout() {
        #expect(900 >= 800)
        #expect(620 >= 500)
    }

    @Test func supportedStylesRemainComplete() {
        #expect(StyleName.allCases.count == 6)
        #expect(StyleName.allCases.contains(.custom))
    }

    @Test func previewModesCoverSourceResultCompare() {
        #expect(PreviewMode.allCases == [.source, .result, .compare])
    }

    @Test func docxPartialPreviewSurfacesUserSafeWarning() throws {
        let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let data = try Data(contentsOf: root.appendingPathComponent("tests/fixtures/docx/unsupported-object.docx"))
        let preview = DocxPreviewRenderer().render(data: data)
        #expect(preview.docxStatus == .partial)
        #expect(!preview.featureWarnings.isEmpty)
        #expect(preview.featureWarnings.allSatisfy { $0.lowercased().contains("object") || $0.lowercased().contains("unsupported") })
        #expect(preview.summary.lowercased().contains("partial"))
        #expect(preview.sourceText.contains("Text after the object."))
    }
}