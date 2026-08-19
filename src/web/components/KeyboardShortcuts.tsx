import { useHotkeys } from '../hooks/use-hotkeys';
import { useWorkflow } from '../state/workflow-context';

/**
 * Renders nothing — installs global keyboard shortcuts.
 * Place inside WorkflowProvider so it can access workflow actions.
 */
export function KeyboardShortcuts() {
  const { runFormatting, resetWorkflow, setActivePanel, source, result, jobStatus } = useWorkflow();

  useHotkeys([
    // Cmd/Ctrl+Enter → run formatting (when source is loaded and not already running)
    {
      key: 'Enter',
      meta: true,
      handler: () => {
        if (source && jobStatus !== 'generating' && jobStatus !== 'validating') {
          runFormatting();
        }
      },
    },
    // Cmd/Ctrl+Shift+R → reset workflow
    {
      key: 'r',
      meta: true,
      shift: true,
      handler: () => {
        resetWorkflow();
      },
    },
    // Cmd/Ctrl+1 → go to upload panel
    {
      key: '1',
      meta: true,
      handler: () => {
        setActivePanel('upload');
      },
    },
    // Cmd/Ctrl+2 → go to configure panel
    {
      key: '2',
      meta: true,
      handler: () => {
        if (source) setActivePanel('configure');
      },
    },
    // Cmd/Ctrl+3 → go to review panel
    {
      key: '3',
      meta: true,
      handler: () => {
        if (result) setActivePanel('review');
      },
    },
  ]);

  return null;
}
