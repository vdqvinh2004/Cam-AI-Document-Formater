import Foundation

public enum NativeFileAccessError: Error, LocalizedError, Sendable {
    case unsupportedFormat
    case emptyFile
    case invalidSource
    public var errorDescription: String? {
        switch self {
        case .unsupportedFormat: "This file type is not supported."
        case .emptyFile: "The selected file is empty."
        case .invalidSource: "The selected file cannot be read."
        }
    }
}

public struct NativeFileAccess: FileAccess, Sendable {
    public init() {}

    public static func format(for url: URL) throws -> DocumentFormat {
        guard let format = DocumentFormat(rawValue: url.pathExtension.lowercased()) else { throw NativeFileAccessError.unsupportedFormat }
        return format
    }

    public func readSource(from url: URL) throws -> (data: Data, sourceHash: String) {
        _ = try Self.format(for: url)
        guard url.isFileURL else { throw NativeFileAccessError.invalidSource }
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        let data: Data
        do { data = try Data(contentsOf: url, options: [.mappedIfSafe]) } catch { throw NativeFileAccessError.invalidSource }
        guard !data.isEmpty else { throw NativeFileAccessError.emptyFile }
        return (data, NativeDigest.hex(data))
    }

    public func chooseExportDestination(for format: DocumentFormat, excluding sourceURL: URL) async throws -> URL? { nil }
}

private enum NativeDigest {
    static func hex(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }
}
