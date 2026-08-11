import { useRouter } from '../router';
import { ROUTES } from '../types/route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PrivacyPage() {
  const { navigate } = useRouter();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy & Data Handling</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Gemini API Disclosure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>This application uses Google's Gemini API to generate formatting plans for your documents. When you confirm formatting, the following data is sent to Google:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Document structure (headings, lists, tables, images, links) — <strong className="text-foreground">not</strong> the full text content</li>
            <li>Your selected style profile and any custom instructions</li>
            <li>A unique job identifier (no personal information)</li>
          </ul>
          <p>The full document text is <strong className="text-foreground">never</strong> sent to the API. Only structural metadata and formatting preferences are transmitted.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Your Gemini API key is stored in your browser's origin-scoped localStorage via the <code className="rounded bg-muted px-1">api-key-storage.ts</code> module. It is:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Never sent to our servers</li>
            <li>Never logged or included in analytics</li>
            <li>Only read in memory when a formatting job starts</li>
            <li>Removable at any time from the Settings page</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Handling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>All document processing happens <strong className="text-foreground">locally in your browser</strong>:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Source files are read into memory only</li>
            <li>Formatting plans are applied locally</li>
            <li>Validation runs against in-memory representations</li>
            <li>Exported files are downloaded directly — never uploaded</li>
          </ul>
          <p><strong className="text-foreground">No document content, extracted text, formatting plans, or comparison data is ever persisted.</strong> Refreshing or closing the browser tab clears all workflow state.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Downloads</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Formatted documents are downloaded as files you control. The application does not retain copies, track downloads, or access your filesystem beyond the file you explicitly select for input and the location you choose for output.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>No Analytics or Tracking</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This application includes no analytics, telemetry, crash reporting, or third-party tracking scripts. Your usage is not monitored.
        </CardContent>
      </Card>

      <div>
        <Button variant="secondary" onClick={() => navigate(ROUTES['/'])}>Back to Workspace</Button>
      </div>
    </div>
  );
}