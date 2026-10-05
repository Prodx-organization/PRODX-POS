/**
 * Centralized PRODX Typography Utility for Prodx POS
 * Enforces enterprise typography scales across all modules.
 */

export const TypographyClasses = {
  // Display Scale (Hero metrics, CFD totals, Grand Totals)
  display2xl: 'text-display-2xl',
  displayXl: 'text-display-xl',
  displayLg: 'text-display-lg',

  // Heading Scale (Screen titles, Section headers, Modals, Cards)
  heading1: 'text-heading-1',
  heading2: 'text-heading-2',
  heading3: 'text-heading-3',
  heading4: 'text-heading-4',

  // Body Scale (Readable paragraphs, descriptions)
  bodyLg: 'text-body-lg',
  bodyMd: 'text-body-md',
  bodyBase: 'text-body-base',
  bodySm: 'text-body-sm',

  // Label Scale (Field labels, metadata badges, categories)
  labelLg: 'text-label-lg',
  labelMd: 'text-label-md',
  labelSm: 'text-label-sm',
} as const;

export type TypographyVariant = keyof typeof TypographyClasses;

/**
 * Helper function to retrieve the CSS class for a typography variant
 */
export function getTypographyClass(variant: TypographyVariant): string {
  return TypographyClasses[variant] || TypographyClasses.bodyMd;
}