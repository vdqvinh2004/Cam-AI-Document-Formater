import type { ReactNode } from 'react';
import type { DashboardPanel } from '../types/panel';
import { cn } from '@/lib/utils';

export interface StepDefinition {
  panel: DashboardPanel;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export function StepIndicator({
  current,
  onSelect,
  gate,
  steps,
}: {
  current: DashboardPanel;
  onSelect: (panel: DashboardPanel) => void;
  gate: Record<DashboardPanel, { available: boolean; reason: string | null }>;
  steps: StepDefinition[];
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = current === step.panel;
        const isComplete = steps.findIndex((s) => s.panel === current) > index;
        const { available, reason } = gate[step.panel];
        return (
          <li key={step.panel} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(step.panel)}
              disabled={!available}
              title={reason ?? undefined}
              aria-disabled={!available}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]',
                isActive ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent',
                isComplete && 'border-transparent bg-muted',
                !available && 'cursor-not-allowed border-transparent bg-muted text-muted-foreground opacity-60 hover:bg-muted'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive && 'text-primary')} aria-hidden="true" />
              {step.label}
            </button>
            {index < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}