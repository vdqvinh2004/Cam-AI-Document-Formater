import Foundation
import Observation
#if canImport(SwiftUI)
import SwiftUI
#endif

@MainActor
@Observable
@available(macOS 14, *)
public final class DocumentWorkflowViewModel {
    public var snapshot = WorkflowSnapshot()
    public var selectedStyle: StyleName = .modern
    public var instructions = ""
    public var disclosureAccepted = false
    public var apiKey = ""
    public var isShowingOpenPanel = false
    public var isShowingSettings = false

    private let client: any GeminiClient
    private let adapterRegistry = NativeAdapterRegistry()
    private var coordinator: JobCoordinator?

    public init(client: any GeminiClient = HTTPGeminiClient()) {
        self.client = client
    }

    public func load(url: URL) {
        do {
            let fileAccess = NativeFileAccess()
            let loaded = try fileAccess.readSource(from: url)
            let format = try NativeFileAccess.format(for: url)
            let document = try adapterRegistry.adapter(for: format).extract(data: loaded.data)
            snapshot.source = document
            snapshot.sourceData = loaded.data
            snapshot.phase = .awaitingConfirmation
            snapshot.progress = .init(phase: .awaitingConfirmation, fraction: 0.1, message: "Ready to generate \(url.lastPathComponent).")
            snapshot.errorMessage = nil
        } catch {
            snapshot.phase = .failed
            snapshot.errorMessage = (error as? LocalizedError)?.errorDescription ?? "Could not read selected document."
            snapshot.progress = .init(phase: .failed, fraction: 1, message: snapshot.errorMessage ?? "Could not read selected document.")
        }
    }

    public func generate() {
        guard let source = snapshot.source else { return }
        let policy = InstructionPolicy().screen(instructions)
        let profile = FormattingProfile(style: selectedStyle, instructions: policy.accepted)
        let coordinator = JobCoordinator()
        self.coordinator = coordinator
        Task { @MainActor in
            await coordinator.start(profile: profile, document: source, client: client, apiKey: apiKey, disclosureAccepted: disclosureAccepted, sourceData: snapshot.sourceData, sourceHash: snapshot.sourceData.map { NativeDigestBridge.hex($0) } ?? "")
            while let current = await coordinator.snapshot as WorkflowSnapshot?, current.phase != .readyToExport && current.phase != .failed && current.phase != .cancelled {
                snapshot = current
                await Task.yield()
            }
            snapshot = await coordinator.snapshot
        }
    }

    public func cancel() {
        Task { await coordinator?.cancel(); if let coordinator { snapshot = await coordinator.snapshot } }
    }

    public func reset() {
        snapshot = WorkflowSnapshot()
        disclosureAccepted = false
        instructions = ""
    }
}

private enum NativeDigestBridge {
    static func hex(_ data: Data) -> String { data.map { String(format: "%02x", $0) }.joined() }
}
