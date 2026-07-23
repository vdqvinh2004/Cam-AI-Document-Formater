import Foundation

public struct RecoveryCoordinator: Sendable {
    private let workspace: any TemporaryWorkspace

    public init(workspace: any TemporaryWorkspace = EphemeralWorkspace()) {
        self.workspace = workspace
    }

    public func cleanStaleWorkspaces() {
        try? workspace.removeStale()
    }

    public func clean(_ url: URL?) {
        guard let url else { return }
        try? workspace.remove(url)
    }
}
