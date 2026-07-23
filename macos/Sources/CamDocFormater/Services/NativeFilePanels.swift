import Foundation
#if canImport(AppKit)
import AppKit
import UniformTypeIdentifiers
#endif

@MainActor
public struct NativeFilePanels: Sendable {
    public init() {}

    public func chooseSource() async -> URL? {
#if canImport(AppKit)
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
                panel.allowedContentTypes = ["txt", "md", "markdown", "docx", "pdf"].compactMap {
                        UTType(filenameExtension: $0, conformingTo: .data)
                }
        return panel.runModal() == .OK ? panel.url : nil
#else
        return nil
#endif
    }

    public func chooseDestination(format: DocumentFormat, sourceURL: URL) async -> URL? {
#if canImport(AppKit)
        let panel = NSSavePanel()
        panel.allowedContentTypes = [UTType(filenameExtension: format.rawValue, conformingTo: .data)].compactMap { $0 }
        panel.nameFieldStringValue = "\(sourceURL.deletingPathExtension().lastPathComponent)-formatted.\(format.rawValue)"
        return panel.runModal() == .OK ? panel.url : nil
#else
        return nil
#endif
    }
}
