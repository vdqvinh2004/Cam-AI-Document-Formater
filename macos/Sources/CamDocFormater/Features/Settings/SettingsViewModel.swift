import Foundation
import Observation

@available(macOS 14, *)
@MainActor
@Observable
public final class SettingsViewModel {
    public private(set) var hasCredential = false
    public private(set) var errorMessage: String?
    private let store: any CredentialStore

    public init(store: any CredentialStore = KeychainCredentialStore()) {
        self.store = store
        refresh()
    }

    public func refresh() {
        do { hasCredential = try store.read()?.isEmpty == false; errorMessage = nil }
        catch { errorMessage = "Secure credential storage is unavailable." }
    }

    public func save(_ value: String) {
        guard !value.isEmpty else { return }
        do { try store.save(value); refresh() }
        catch { errorMessage = "Could not save the API key securely." }
    }

    public func remove() {
        do { try store.remove(); refresh() }
        catch { errorMessage = "Could not remove the API key." }
    }
}
