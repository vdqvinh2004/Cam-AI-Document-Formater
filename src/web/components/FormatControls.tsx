import { useWorkflow } from '../state/workflow-context';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

const STYLES = ['simple', 'modern', 'professional', 'easy-to-read', 'academic', 'custom'] as const;

export function FormatControls() {
  const { state, setStyle, setInstructions, setDisclosed } = useWorkflow();
  const customStyle = state.style === 'custom';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="style-profile">Style Profile</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between capitalize">
              {state.style}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            {STYLES.map((style) => (
              <DropdownMenuItem
                key={style}
                className={state.style === style ? 'font-medium' : ''}
                onSelect={() => setStyle(style)}
              >
                {style}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {customStyle && !state.instructions.trim() && (
          <p className="text-sm text-warning" role="alert">Describe the custom style before formatting.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="custom-instructions">
            {customStyle ? 'Custom Style Description (required)' : 'Custom Instructions (optional)'}
          </Label>
          <span className="text-xs text-muted-foreground">{state.instructions.length}/2000 characters</span>
        </div>
        <Textarea
          id="custom-instructions"
          value={state.instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={2000}
          required={customStyle}
          aria-required={customStyle}
          placeholder={
            customStyle
              ? "Describe the style, e.g. 'Move the introduction after the summary and keep the same format'"
              : "Presentation guidance only (e.g., 'Use larger headings', 'Increase line spacing')"
          }
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Network Disclosure</Label>
        <label className="flex items-start gap-2 rounded-md border p-4 text-sm text-muted-foreground">
          <Checkbox
            checked={state.disclosed}
            onCheckedChange={(checked) => setDisclosed(checked === true)}
          />
          <span>
            Custom style requests send your instructions and document structure to Google's Gemini API. The full document text is never transmitted. Named styles are applied locally in your browser.
          </span>
        </label>
      </div>
    </div>
  );
}