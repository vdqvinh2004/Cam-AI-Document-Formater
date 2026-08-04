import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useWorkflow } from '../state/workflow-context';

export function FormatControls() {
  const { state, setStyle, setInstructions, setDisclosed } = useWorkflow();

  return (
    <div className="format-controls">
      <section className="setup-section">
        <h2>Style Profile</h2>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger className="style-trigger">
            {state.style}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="dropdown-content" sideOffset={4}>
              {[
                'simple',
                'modern',
                'professional',
                'easy-to-read',
                'academic',
                'custom',
              ].map((style) => (
                <DropdownMenu.Item
                  key={style}
                  className={`dropdown-item ${state.style === style ? 'active' : ''}`}
                  onSelect={() => setStyle(style as typeof state.style)}
                >
                  {style}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </section>

      <section className="setup-section">
        <h2>Custom Instructions</h2>
        <textarea
          value={state.instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={2000}
          placeholder="Presentation guidance only (e.g., 'Use larger headings', 'Increase line spacing')"
          rows={4}
          className="instructions-textarea"
        />
        <p className="char-count">{state.instructions.length}/2000 characters</p>
      </section>

      <section className="setup-section">
        <h2>Network Disclosure</h2>
        <label className="disclosure-label">
          <input
            type="checkbox"
            checked={state.disclosed}
            onChange={(e) => setDisclosed(e.target.checked)}
          />
          <span>I understand this formatting request sends document structure and formatting preferences to Google's Gemini API. The full document text is never transmitted.</span>
        </label>
      </section>
    </div>
  );
}