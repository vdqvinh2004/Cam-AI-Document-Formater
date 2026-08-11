export type DashboardPanel = 'upload' | 'configure' | 'review';

export const PANEL_ROUTE: Record<DashboardPanel, string> = {
  upload: '/?panel=upload',
  configure: '/?panel=configure',
  review: '/?panel=review',
};

export function panelFromSearch(search: string): DashboardPanel {
  const panel = new URLSearchParams(search).get('panel');
  return panel === 'configure' || panel === 'review' || panel === 'upload' ? panel : 'upload';
}

export function panelToSearch(panel: DashboardPanel): string {
  return panel === 'upload' ? '' : `?panel=${panel}`;
}