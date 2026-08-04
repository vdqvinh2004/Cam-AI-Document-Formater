import { useWorkflow } from '../state/workflow-context';

export function PrivacyPage() {
  const { navigate } = useWorkflow();

  return (
    <div className="privacy-page">
      <h1>Privacy & Data Handling</h1>
      
      <section>
        <h2>Gemini API Disclosure</h2>
        <p>
          This application uses Google's Gemini API to generate formatting plans for your documents.
          When you confirm formatting, the following data is sent to Google:
        </p>
        <ul>
          <li>Document structure (headings, lists, tables, images, links) — <strong>not</strong> the full text content</li>
          <li>Your selected style profile and any custom instructions</li>
          <li>A unique job identifier (no personal information)</li>
        </ul>
        <p>
          The full document text is <strong>never</strong> sent to the API. Only structural metadata
          and formatting preferences are transmitted.
        </p>
      </section>

      <section>
        <h2>API Key Storage</h2>
        <p>
          Your Gemini API key is stored in your browser's origin-scoped localStorage via the
          <code>api-key-storage.ts</code> module. It is:
        </p>
        <ul>
          <li>Never sent to our servers</li>
          <li>Never logged or included in analytics</li>
          <li>Only read in memory when a formatting job starts</li>
          <li>Removable at any time from the Settings page</li>
        </ul>
      </section>

      <section>
        <h2>Document Handling</h2>
        <p>
          All document processing happens <strong>locally in your browser</strong>:
        </p>
        <ul>
          <li>Source files are read into memory only</li>
          <li>Formatting plans are applied locally</li>
          <li>Validation runs against in-memory representations</li>
          <li>Exported files are downloaded directly — never uploaded</li>
        </ul>
        <p>
          <strong>No document content, extracted text, formatting plans, or comparison data is ever persisted.</strong>
          Refreshing or closing the browser tab clears all workflow state.
        </p>
      </section>

      <section>
        <h2>Downloads</h2>
        <p>
          Formatted documents are downloaded as files you control. The application does not retain
          copies, track downloads, or access your filesystem beyond the file you explicitly select
          for input and the location you choose for output.
        </p>
      </section>

      <section>
        <h2>No Analytics or Tracking</h2>
        <p>
          This application includes no analytics, telemetry, crash reporting, or third-party
          tracking scripts. Your usage is not monitored.
        </p>
      </section>

      <button 
        onClick={() => navigate({ path: '/', label: 'Workspace', requiresDocument: false, requiresResult: false })} 
        className="btn-secondary"
      >
        Back to Workspace
      </button>
    </div>
  );
}