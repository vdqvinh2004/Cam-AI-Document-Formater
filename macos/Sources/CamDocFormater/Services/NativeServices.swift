import Foundation

#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct HTTPGeminiClient: GeminiClient, Sendable {
    public let session: URLSession
    public let endpoint: URL

    public init(session: URLSession = .shared, endpoint: URL = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")!) {
        self.session = session
        self.endpoint = endpoint
    }

    public func formattingPlan(for document: CanonicalDocument, profile: FormattingProfile, apiKey: String, disclosureAccepted: Bool) async throws -> FormattingPlan {
        guard disclosureAccepted else { throw NativeContractError.missingDisclosure }
        guard !apiKey.isEmpty else { throw NativeServiceError.missingCredential }
        let body = try JSONSerialization.data(withJSONObject: [
            "contents": [["parts": [["text": "Return presentation-only JSON for \(document.blocks.count) nodes. Style: \(profile.style.rawValue). Instructions: \(String((profile.instructions ?? "").prefix(2000)))"]]]]
        ])
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.httpBody = body
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-goog-api-key")
        let (data, response) = try await session.data(for: request)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw NativeServiceError.requestFailed }
        guard data.count < 1_000_000 else { throw NativeServiceError.responseTooLarge }
                guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                            let candidates = root["candidates"] as? [[String: Any]],
                            let content = candidates.first?["content"] as? [String: Any],
                            let parts = content["parts"] as? [[String: Any]],
                            let text = parts.first?["text"] as? String else {
                        throw NativeServiceError.invalidResponse
                }
                let cleaned = text.replacingOccurrences(of: "```json", with: "").replacingOccurrences(of: "```", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
                guard let planData = cleaned.data(using: .utf8) else { throw NativeServiceError.invalidResponse }
                return try JSONDecoder().decode(FormattingPlan.self, from: planData).validated(against: document)
    }
}

public enum NativeServiceError: Error, LocalizedError, Sendable {
    case missingCredential
    case requestFailed
    case responseTooLarge
    case keychainUnavailable
    case sourceDestinationConflict
    case destinationExists
    case invalidResponse
    case invalidSource

    public var errorDescription: String? {
        switch self {
        case .missingCredential: "Gemini API key is not configured."
        case .requestFailed: "Gemini request failed."
        case .responseTooLarge: "Gemini response exceeded safe limit."
        case .keychainUnavailable: "Secure credential storage is unavailable."
        case .sourceDestinationConflict: "Export destination must differ from source."
        case .destinationExists: "Export destination already exists. Choose a different file name."
        case .invalidResponse: "Gemini returned an invalid formatting plan."
        case .invalidSource: "Source file is unavailable."
        }
    }
}

#if canImport(Security)
import Security

public struct KeychainCredentialStore: CredentialStore, Sendable {
    private let service: String
    private let account: String

    public init(service: String = "com.camdocformater.app", account: String = "gemini-api-key") {
        self.service = service
        self.account = account
    }

    public func read() throws -> String? {
        var query = baseQuery
        query[kSecReturnData] = true
        query[kSecMatchLimit] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else { throw NativeServiceError.keychainUnavailable }
        return value
    }

    public func save(_ value: String) throws {
        let data = Data(value.utf8)
        let status = SecItemAdd(baseQuery.merging([kSecValueData: data, kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]) { $1 } as CFDictionary, nil)
        if status == errSecDuplicateItem {
            let update = SecItemUpdate(baseQuery as CFDictionary, [kSecValueData: data] as CFDictionary)
            guard update == errSecSuccess else { throw NativeServiceError.keychainUnavailable }
        } else if status != errSecSuccess { throw NativeServiceError.keychainUnavailable }
    }

    public func remove() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw NativeServiceError.keychainUnavailable }
    }

    private var baseQuery: [CFString: Any] { [kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account] }
}
#else
public struct KeychainCredentialStore: CredentialStore, Sendable {
    public init() {}
    public func read() throws -> String? { throw NativeServiceError.keychainUnavailable }
    public func save(_ value: String) throws { throw NativeServiceError.keychainUnavailable }
    public func remove() throws { throw NativeServiceError.keychainUnavailable }
}
#endif

public struct LocalFileAccess: FileAccess, Sendable {
    public init() {}

    public func readSource(from url: URL) throws -> (data: Data, sourceHash: String) {
        guard url.isFileURL else { throw NativeServiceError.invalidSource }
        let data = try Data(contentsOf: url, options: [.mappedIfSafe])
        guard !data.isEmpty else { throw NativeServiceError.invalidSource }
        return (data, SHA256Digest.hex(data))
    }

    public func chooseExportDestination(for format: DocumentFormat, excluding sourceURL: URL) async throws -> URL? { nil }
}

public struct EphemeralWorkspace: TemporaryWorkspace, Sendable {
    private let root: URL
    public init(root: URL = FileManager.default.temporaryDirectory) { self.root = root }

    public func create(jobID: String) throws -> URL {
        let directory = root.appendingPathComponent("CamDocFormater-\(jobID)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
        return directory
    }

    public func remove(_ url: URL) throws { try? FileManager.default.removeItem(at: url) }
    public func removeStale() throws {
        for url in try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil) where url.lastPathComponent.hasPrefix("CamDocFormater-") { try remove(url) }
    }
}

public struct AtomicExportService: ExportService, Sendable {
    public init() {}

    public func export(data: Data, to destination: URL, sourceURL: URL, validation: ValidationResult) throws {
        guard validation.status == .pass, destination.standardizedFileURL != sourceURL.standardizedFileURL else {
            throw validation.status == .pass ? NativeServiceError.sourceDestinationConflict : NativeContractError.unsafeExport
        }
        let temporary = destination.deletingLastPathComponent().appendingPathComponent(".\(destination.lastPathComponent).tmp-\(UUID().uuidString)")
        try data.write(to: temporary, options: [.atomic])
        if FileManager.default.fileExists(atPath: destination.path) {
            _ = try FileManager.default.replaceItemAt(destination, withItemAt: temporary, backupItemName: nil, options: .usingNewMetadataOnly)
        } else {
            try FileManager.default.moveItem(at: temporary, to: destination)
        }
    }
}

private enum SHA256Digest {
    static func hex(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }
}