#if canImport(SwiftUI)
import SwiftUI
import Observation

@available(macOS 14, *)
@Observable
final class WorkspaceModel {
    var selectedStyle: StyleName = .modern
    var selectedFilename: String?
    var status = "Select a document to begin."
    var disclosureAccepted = false
    var showingSettings = false

    func chooseDocument() {
        status = "Use File > Open to select one supported document."
    }
}

@available(macOS 14, *)
@main
struct CamDocFormaterApp: App {
    @State private var model = DocumentWorkflowViewModel()

    var body: some Scene {
        WindowGroup("Cam DocFormater") {
            DocumentWorkflowView(model: model)
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Open Document") { model.isShowingOpenPanel = true }
                    .keyboardShortcut("o", modifiers: [.command])
                Button("Settings") { model.isShowingSettings = true }
                    .keyboardShortcut(",", modifiers: [.command])
            }
        }
    }
}

@available(macOS 14, *)
struct WorkspaceView: View {
    @Bindable var model: WorkspaceModel

    var body: some View {
        NavigationSplitView {
            List {
                Label("Workspace", systemImage: "doc.text")
                Label("Settings", systemImage: "gearshape")
            }
            .navigationTitle("Cam DocFormater")
            .listStyle(.sidebar)
        } detail: {
            VStack(spacing: 0) {
                ToolbarView(model: model)
                Divider()
                HStack(spacing: 0) {
                    DocumentQueueView(model: model)
                    Divider()
                    WorkspaceDetailView(model: model)
                }
            }
        }
    }
}

@available(macOS 14, *)
struct ToolbarView: View {
    @Bindable var model: WorkspaceModel

    var body: some View {
        HStack {
            Button(action: model.chooseDocument) { Label("Open", systemImage: "folder") }
            Divider().frame(height: 20)
            Text(model.status).foregroundStyle(.secondary).lineLimit(1)
            Spacer()
            Button { model.showingSettings = true } label: { Image(systemName: "gearshape") }
                .help("Settings")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

@available(macOS 14, *)
struct DocumentQueueView: View {
    @Bindable var model: WorkspaceModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("DOCUMENT QUEUE").font(.caption).foregroundStyle(.secondary)
            if let filename = model.selectedFilename {
                Label(filename, systemImage: "doc")
            } else {
                ContentUnavailableView("No document", systemImage: "doc.badge.plus", description: Text("Open or drop one supported file."))
            }
            Spacer()
        }
        .padding(20)
        .frame(width: 260, alignment: .topLeading)
    }
}

@available(macOS 14, *)
struct WorkspaceDetailView: View {
    @Bindable var model: WorkspaceModel

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Document workspace").font(.largeTitle.weight(.semibold))
            Text("Presentation changes stay separate from document content.").foregroundStyle(.secondary)
            Picker("Style", selection: $model.selectedStyle) {
                ForEach(StyleName.allCases, id: \.self) { style in Text(style.rawValue.capitalized).tag(style) }
            }
            .pickerStyle(.menu)
            Toggle("I understand document content will be sent to Gemini", isOn: $model.disclosureAccepted)
            HStack {
                Button("Generate formatting plan") { model.status = "Formatting pass ready to start." }
                    .buttonStyle(.borderedProminent)
                Button("Preview") { model.status = "Preview appears after validation." }
            }
            Spacer()
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

@available(macOS 14, *)
struct SettingsView: View {
    @Bindable var model: WorkspaceModel

    var body: some View {
        Form {
            Section("Gemini") {
                SecureField("API key", text: .constant(""))
                Text("Stored in macOS Keychain. Never shown or logged.").foregroundStyle(.secondary)
            }
        }
        .padding(24)
        .frame(width: 420)
    }
}
#endif