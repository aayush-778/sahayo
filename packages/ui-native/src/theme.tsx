import { createContext, useContext, type ReactNode } from 'react';

import { brandColors, workerColors } from '../tokens';

/**
 * Which app is rendering: the customer app or the worker app.
 *
 * Both apps share every primitive in this package, but they are not the same
 * product in the hand. The customer app is green on cream. The worker app is
 * blue, and it is used one-handed, outdoors, often in direct sunlight, by
 * someone who may be mid-job — so it also runs one step larger type, taller
 * controls, and text held to 7:1 contrast instead of 4.5:1.
 *
 * WHY A CONTEXT RATHER THAN DIFFERENT TOKEN VALUES. Both apps compile one
 * Tailwind preset through tailwind.config.js files that CLAUDE.md requires to
 * stay byte-identical, so changing the `brand-*` values would recolour both
 * apps at once. Instead the preset carries two named palettes, `brand-*` and
 * `worker-*`, and every primitive asks this context which to use.
 *
 * The default is 'customer', and its column below reproduces exactly the
 * classes the primitives hardcoded before theming existed. The customer app
 * never mounts a ThemeProvider, so it renders as it did.
 */
export type AppTheme = 'customer' | 'worker';

const ThemeContext = createContext<AppTheme>('customer');

export function ThemeProvider({ theme, children }: { theme: AppTheme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}

type ThemeRole =
  | 'ink'
  | 'muted'
  | 'primaryText'
  | 'onPrimary'
  | 'dangerText'
  | 'successText'
  | 'groundBg'
  | 'surfaceBg'
  | 'primaryBg'
  | 'primarySoftBg'
  | 'primaryTintBg'
  | 'successBg'
  | 'dividerBg'
  | 'inkFaintBg'
  | 'primaryBorder'
  | 'controlBorder'
  | 'dividerBorder'
  | 'dangerBorder'
  | 'captionSize'
  | 'labelSize'
  | 'bodySize'
  | 'titleSize'
  | 'buttonHeight'
  | 'searchHeight';

/**
 * Role → class, per theme.
 *
 * Every class is a whole literal, in both columns. Tailwind's content scanner
 * reads this file as text — a class assembled at runtime from `worker-${role}`
 * compiles to nothing and renders unstyled, silently. Typing both columns as
 * `Record<ThemeRole, string>` makes a role missing from either one a compile
 * error rather than a blank style in one app.
 */
export const THEME_CLASSES: Record<AppTheme, Record<ThemeRole, string>> = {
  customer: {
    ink: 'text-brand-navy',
    muted: 'text-brand-muted',
    primaryText: 'text-brand-primary',
    onPrimary: 'text-white',
    dangerText: 'text-brand-danger',
    successText: 'text-brand-success',
    groundBg: 'bg-brand-cream',
    surfaceBg: 'bg-brand-surface',
    primaryBg: 'bg-brand-primary',
    primarySoftBg: 'bg-brand-primary-soft',
    primaryTintBg: 'bg-brand-primary-tint',
    successBg: 'bg-brand-success',
    dividerBg: 'bg-brand-border',
    inkFaintBg: 'bg-brand-navy/20',
    primaryBorder: 'border-brand-primary',
    controlBorder: 'border-brand-border',
    dividerBorder: 'border-brand-border',
    dangerBorder: 'border-brand-danger',
    captionSize: 'text-xs',
    labelSize: 'text-sm',
    bodySize: 'text-base',
    titleSize: 'text-xl',
    buttonHeight: 'h-14',
    searchHeight: 'h-12',
  },
  worker: {
    ink: 'text-worker-ink',
    muted: 'text-worker-muted',
    primaryText: 'text-worker-primary',
    onPrimary: 'text-white',
    dangerText: 'text-worker-danger',
    successText: 'text-worker-success',
    groundBg: 'bg-worker-ground',
    surfaceBg: 'bg-worker-surface',
    primaryBg: 'bg-worker-primary',
    primarySoftBg: 'bg-worker-primary-soft',
    primaryTintBg: 'bg-worker-primary-tint',
    successBg: 'bg-worker-success',
    dividerBg: 'bg-worker-border',
    inkFaintBg: 'bg-worker-ink/20',
    primaryBorder: 'border-worker-primary',
    // An outline that LOCATES a control has to clear WCAG 1.4.11's 3:1. The
    // decorative divider does not, and must never be used to outline an input.
    controlBorder: 'border-worker-outline',
    dividerBorder: 'border-worker-border',
    dangerBorder: 'border-worker-danger',
    // The customer app's compact scale, by design decision in sub-phase 4.5:
    // the larger type read as crowded. Every step keeps 1.5x leading, so
    // Devanagari conjuncts stay clear.
    captionSize: 'text-xs',
    labelSize: 'text-sm',
    bodySize: 'text-base',
    titleSize: 'text-xl',
    // 56dp and 48dp — still at or above this app's 48dp floor for anything
    // pressed with a thumb.
    buttonHeight: 'h-14',
    searchHeight: 'h-12',
  },
};

export function useThemeClasses(): Record<ThemeRole, string> {
  return THEME_CLASSES[useAppTheme()];
}

/**
 * Raw colour values, for the places a className cannot reach: a navigator's
 * tint colour, a TextInput's placeholder, an ActivityIndicator, an icon.
 */
export interface ThemeColors {
  primary: string;
  primaryDark: string;
  ink: string;
  muted: string;
  ground: string;
  surface: string;
  outline: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  onPrimary: string;
}

export const THEME_COLORS: Record<AppTheme, ThemeColors> = {
  customer: {
    primary: brandColors.primary,
    primaryDark: brandColors['primary-dark'],
    ink: brandColors.navy,
    muted: brandColors.muted,
    ground: brandColors.cream,
    surface: brandColors.surface,
    outline: brandColors.border,
    border: brandColors.border,
    success: brandColors.success,
    warning: brandColors.warning,
    danger: brandColors.danger,
    onPrimary: brandColors.surface,
  },
  worker: {
    primary: workerColors.primary,
    primaryDark: workerColors['primary-dark'],
    ink: workerColors.ink,
    muted: workerColors.muted,
    ground: workerColors.ground,
    surface: workerColors.surface,
    outline: workerColors.outline,
    border: workerColors.border,
    success: workerColors.success,
    warning: workerColors.warning,
    danger: workerColors.danger,
    onPrimary: workerColors.surface,
  },
};

export function useThemeColors(): ThemeColors {
  return THEME_COLORS[useAppTheme()];
}

/**
 * Touch metrics that are numbers rather than classes.
 *
 * `checkboxHitSlop` extends a 20pt box on every side: 10 gives the customer
 * app's 40pt target, 14 gives the worker app its required 48dp.
 */
export const THEME_METRICS: Record<AppTheme, { checkboxHitSlop: number }> = {
  customer: { checkboxHitSlop: 10 },
  worker: { checkboxHitSlop: 14 },
};

export function useThemeMetrics(): { checkboxHitSlop: number } {
  return THEME_METRICS[useAppTheme()];
}
