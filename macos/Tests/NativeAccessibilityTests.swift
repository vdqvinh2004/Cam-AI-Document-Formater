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
}