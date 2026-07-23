#if canImport(SwiftUI)
import SwiftUI

@available(macOS 14, *)
public struct DocumentWorkflowView: View {
    @Bindable var model: DocumentWorkflowViewModel

    public init(model: DocumentWorkflowViewModel) { self.model = model }

    public var body: some View {
        NavigationSplitView {
            VStack(alignment: .leading, spacing: 12) {
                Label("Document queue", systemImage: "doc.text")
                    .font(.headline)
                if let source = model.snapshot.source {
                    Label(source.format.rawValue.uppercased(), systemImage: "doc")
                        .accessibilityLabel("Loaded \(source.format.rawValue) document")
                } else {
                    ContentUnavailableView("No document", systemImage: "doc.badge.plus", description: Text("Open or drop one supported file."))
                }
                Spacer()
            }
            .padding(20)
            .navigationTitle("Cam DocFormater")
            .frame(minWidth: 240)
        } detail: {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Button { model.isShowingOpenPanel = true } label: { Label("Open", systemImage: "folder") }
                        .keyboardShortcut("o", modifiers: [.command])
                    Button { model.isShowingSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                    Spacer()
                    Text(model.snapshot.progress.message).foregroundStyle(.secondary)
                }
                Divider()
                Text("Document workspace").font(.largeTitle.weight(.semibold))
                Picker("Style", selection: $model.selectedStyle) {
                    ForEach(StyleName.allCases, id: \.self) { style in
                        Text(style.rawValue.replacingOccurrences(of: "-", with: " ").capitalized).tag(style)
                    }
                }
                .accessibilityIdentifier("style-picker")
                TextField("Additional formatting instructions", text: $model.instructions, axis: .vertical)
                    .lineLimit(3...6)
                Toggle("I understand document content will be sent to Gemini", isOn: $model.disclosureAccepted)
                    .accessibilityIdentifier("network-disclosure")
                HStack {
                    Button("Generate formatting plan") { model.generate() }
                        .buttonStyle(.borderedProminent)
                        .disabled(model.snapshot.source == nil || !model.disclosureAccepted || !model.hasCredential)
                    if model.snapshot.phase == .generating || model.snapshot.phase == .validating {
                        Button("Cancel") { model.cancel() }
                    }
                    Button("Reset") { model.reset() }
                }
                if let validation = model.snapshot.validation {
                    Label(validation.status == .pass ? "Validation passed" : "Export blocked", systemImage: validation.status == .pass ? "checkmark.circle" : "xmark.octagon")
                        .foregroundStyle(validation.status == .pass ? .green : .red)
                }
                if let error = model.snapshot.errorMessage { Text(error).foregroundStyle(.red) }
                Spacer()
            }
            .padding(32)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .fileImporter(isPresented: $model.isShowingOpenPanel, allowedContentTypes: [.data], allowsMultipleSelection: false) { result in
                if case let .success(urls) = result, let url = urls.first { model.load(url: url) }
            }
            .sheet(isPresented: $model.isShowingSettings) { NativeSettingsView(model: model) }
        }
        .frame(minWidth: 900, minHeight: 620)
        .onDrop(of: [.fileURL], isTargeted: nil) { providers in
            guard let provider = providers.first else { return false }
            _ = provider.loadObject(ofClass: URL.self) { url, _ in
                if let url { Task { @MainActor in model.load(url: url) } }
            }
            return true
        }
    }
}

@available(macOS 14, *)
private struct NativeSettingsView: View {
    @Bindable var model: DocumentWorkflowViewModel

    var body: some View {
        Form {
            SecureField("Gemini API key", text: $model.apiKey)
            HStack {
                Button(model.hasCredential ? "Replace key" : "Save key") { model.saveAPIKey() }
                    .disabled(model.apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                if model.hasCredential {
                    Button("Delete key", role: .destructive) { model.removeAPIKey() }
                }
            }
            Text(model.hasCredential ? "Key stored in macOS Keychain. Never shown or logged." : "No Gemini key stored. Key remains in macOS Keychain and is never logged.")
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .frame(width: 420)
    }
}
#endif
