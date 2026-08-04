import Foundation

public struct DocxPreviewRenderer: Sendable {
    private let maxPackageBytes = 20 * 1024 * 1024
    private let maxXMLBytes = 8 * 1024 * 1024

    public init() {}

    public func render(data: Data) -> PreviewModel {
        guard data.count > 0, data.count <= maxPackageBytes else { return unavailable("DOCX is empty or exceeds the preview size limit.") }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("cam-docx-preview-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: directory) }
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let archive = directory.appendingPathComponent("document.docx")
            let xmlURL = directory.appendingPathComponent("word/document.xml")
            try data.write(to: archive, options: .completeFileProtection)
            let wordDirectory = xmlURL.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: wordDirectory, withIntermediateDirectories: true)
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/unzip")
            process.arguments = ["-p", archive.path, "word/document.xml"]
            let output = Pipe()
            process.standardOutput = output
            process.standardError = Pipe()
            try process.run()
            process.waitUntilExit()
            guard process.terminationStatus == 0 else { return unavailable("The DOCX document part could not be read.") }
            let xml = output.fileHandleForReading.readDataToEndOfFile()
            guard xml.count <= maxXMLBytes, let content = String(data: xml, encoding: .utf8) else { return unavailable("The DOCX document part exceeds the preview limit.") }
            let paragraphs = content.matches(of: /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/).compactMap { match -> String? in
                let value = match.output.1.replacingOccurrences(of: #"<w:t(?:\s[^>]*)?>"#, with: "", options: .regularExpression).replacingOccurrences(of: "</w:t>", with: "")
                let text = value.replacingOccurrences(of: #"<[^>]+>"#, with: "", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines)
                return text.isEmpty ? nil : text
            }
            guard !paragraphs.isEmpty else { return unavailable("No readable text was found in this DOCX.") }
            let warnings = content.contains("<w:object") ? ["Some embedded DOCX objects are not rendered."] : []
            let blocks = paragraphs.enumerated().map { DocxPreviewBlock(index: $0.offset, text: $0.element) }
            let text = paragraphs.joined(separator: "\n")
            return PreviewModel(sourceText: text, outputText: text, available: true, summary: warnings.isEmpty ? "DOCX preview ready." : "DOCX preview is partial.", docxStatus: warnings.isEmpty ? .rendered : .partial, docxBlocks: blocks, featureWarnings: warnings)
        } catch {
            return unavailable("This DOCX package could not be safely rendered.", status: .failed)
        }
    }

    private func unavailable(_ message: String, status: DocxPreviewStatus = .unavailable) -> PreviewModel {
        PreviewModel(sourceText: "", outputText: "", available: false, summary: message, docxStatus: status, docxBlocks: [], featureWarnings: [message])
    }
}
