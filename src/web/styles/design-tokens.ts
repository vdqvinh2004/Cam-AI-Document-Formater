export const designTokens = {
  colors: {
    background: '#f1eee6',
    backgroundWarm: '#fffdf6',
    backgroundCard: 'rgba(255, 252, 244, .62)',
    textPrimary: '#173f3b',
    textMuted: '#55736a',
    textWarning: '#8e4c3e',
    textSuccess: '#2b6457',
    accentPrimary: '#d46e4b',
    accentSecondary: '#f2c77e',
    accentMuted: '#7b8f84',
    border: '#8ca79b',
    borderFocus: '#d46e4b',
    error: '#d46e4b',
    focusRing: 'rgba(212, 110, 75, 0.4)',
    overlay: 'rgba(0, 0, 0, 0.4)',
    shadow: '#acc8b6',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    fontFamily: {
      serif: 'Georgia, "Times New Roman", serif',
      mono: 'Menlo, monospace',
    },
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      lg: '16px',
      xl: '20px',
      xxl: '28px',
      display: 'clamp(52px, 9vw, 112px)',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.45,
      relaxed: 1.5,
    },
    letterSpacing: {
      tight: '0.08em',
      wide: '0.12em',
    },
  },
  radii: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  shadows: {
    card: '12px 12px 0 #acc8b6',
    cardSmall: '7px 7px 0 #acc8b6',
    focus: '0 0 0 3px rgba(212, 110, 75, 0.4)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
  },
  zIndex: {
    dropdown: 100,
    modal: 200,
    tooltip: 300,
  },
} as const;

export type DesignTokens = typeof designTokens;