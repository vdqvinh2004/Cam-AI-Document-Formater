import Foundation
import Testing

@Suite("Packaged app smoke contracts")
struct PackagedAppSmokeTests {
    @Test func packagedBundleContainsLaunchableMetadataWhenBuilt() throws {
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let app = root.appendingPathComponent(".build/CamDocFormater.app")
        let executable = app.appendingPathComponent("Contents/MacOS/CamDocFormater")
        let plist = app.appendingPathComponent("Contents/Info.plist")
        let icon = app.appendingPathComponent("Contents/Resources/AppIcon.icns")

        guard FileManager.default.fileExists(atPath: app.path) else { return }
        #expect(FileManager.default.isExecutableFile(atPath: executable.path))
        #expect(FileManager.default.fileExists(atPath: plist.path))
        #expect(FileManager.default.fileExists(atPath: icon.path))
        let values = NSDictionary(contentsOf: plist)
        #expect(values?["CFBundleIdentifier"] as? String == "com.camdocformater.app")
    }

    @Test func packagedBundleCanLaunchWhenRequested() throws {
        guard ProcessInfo.processInfo.environment["RUN_PACKAGED_APP_SMOKE"] == "1" else { return }
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let executable = root.appendingPathComponent(".build/CamDocFormater.app/Contents/MacOS/CamDocFormater")
        let process = Process()
        process.executableURL = executable
        try process.run()
        #expect(process.isRunning)
        process.terminate()
        process.waitUntilExit()
    }
}
