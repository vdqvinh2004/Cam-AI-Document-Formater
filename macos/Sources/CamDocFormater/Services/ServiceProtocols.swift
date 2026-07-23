import Foundation

public protocol DocumentAdapter: Sendable {
    var format: DocumentFormat { get }
    func extract(data: Data) throws -> CanonicalDocument
    func serialize(document: CanonicalDocument) throws -> Data
}

public protocol GeminiClient: Sendable {
    func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan
}

public protocol CredentialStore: Sendable {
    func read() throws -> String?
    func save(_ value: String) throws
    func remove() throws
}

public protocol FileAccess: Sendable {
    func readSource(from url: URL) throws -> (data: Data, sourceHash: String)
    func chooseExportDestination(for format: DocumentFormat, excluding sourceURL: URL) async throws -> URL?
}

public protocol TemporaryWorkspace: Sendable {
    func create(jobID: String) throws -> URL
    func remove(_ url: URL) throws
    func removeStale() throws
}

public protocol ExportService: Sendable {
    func export(data: Data, to destination: URL, sourceURL: URL, validation: ValidationResult) throws
}

public struct NativeServices: Sendable {
    public let gemini: any GeminiClient
    public let credentials: any CredentialStore
    public let files: any FileAccess
    public let workspace: any TemporaryWorkspace
    public let exporter: any ExportService

    public init(gemini: any GeminiClient, credentials: any CredentialStore, files: any FileAccess, workspace: any TemporaryWorkspace, exporter: any ExportService) {
        self.gemini = gemini
        self.credentials = credentials
        self.files = files
        self.workspace = workspace
        self.exporter = exporter
    }
}