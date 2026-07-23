import Foundation

public struct NativeExportService: ExportService, Sendable {
    public init() {}

    public func export(data: Data, to destination: URL, sourceURL: URL, validation: ValidationResult) throws {
        guard validation.status == .pass else { throw NativeContractError.unsafeExport }
        guard destination.standardizedFileURL != sourceURL.standardizedFileURL else { throw NativeServiceError.sourceDestinationConflict }
        let parent = destination.deletingLastPathComponent()
        let temporary = parent.appendingPathComponent(".\(destination.lastPathComponent).tmp-\(UUID().uuidString)")
        try data.write(to: temporary, options: [.atomic])
        defer { try? FileManager.default.removeItem(at: temporary) }
        if FileManager.default.fileExists(atPath: destination.path) {
            throw NativeServiceError.destinationExists
        }
        try FileManager.default.moveItem(at: temporary, to: destination)
    }
}
