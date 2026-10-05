import React from 'react';

export type TypographyVariant =
  | 'display-2xl'
  | 'display-xl'
  | 'display-lg'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label-lg'
  | 'label-md'
  | 'label-sm'
  | 'label-xs'
  | 'caption'
  | 'caption-sm'
  | 'mono-lg'
  | 'mono-md'
  | 'mono-sm'
  | 'mono-xs';

export type TypographyWeight =
  | 'normal'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'extrabold'
  | 'black';

export type TypographyColor =
  | 'default'
  | 'muted'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'amber'
  | 'inherit'
  | 'white';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: React.ElementType;
  weight?: TypographyWeight;
  color?: TypographyColor;
  truncate?: boolean;
  uppercase?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const variantClassMap: Record<TypographyVariant, string> = {
  'display-2xl': 'text-display-2xl',
  'display-xl': 'text-display-xl',
  'display-lg': 'text-display-lg',
  'heading-1': 'text-heading-1',
  'heading-2': 'text-heading-2',
  'heading-3': 'text-heading-3',
  'heading-4': 'text-heading-4',
  'body-lg': 'text-body-lg',
  'body-md': 'text-body-md',
  'body-sm': 'text-body-sm',
  'label-lg': 'text-label-lg',
  'label-md': 'text-label-md',
  'label-sm': 'text-label-sm',
  'label-xs': 'text-label-xs',
  'caption': 'text-caption',
  'caption-sm': 'text-caption-sm',
  'mono-lg': 'text-mono-lg',
  'mono-md': 'text-mono-md',
  'mono-sm': 'text-mono-sm',
  'mono-xs': 'text-mono-xs',
};

const defaultElementMap: Record<TypographyVariant, React.ElementType> = {
  'display-2xl': 'h1',
  'display-xl': 'h1',
  'display-lg': 'h2',
  'heading-1': 'h1',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'heading-4': 'h4',
  'body-lg': 'p',
  'body-md': 'p',
  'body-sm': 'p',
  'label-lg': 'label',
  'label-md': 'span',
  'label-sm': 'span',
  'label-xs': 'span',
  'caption': 'p',
  'caption-sm': 'p',
  'mono-lg': 'span',
  'mono-md': 'span',
  'mono-sm': 'span',
  'mono-xs': 'span',
};

const weightClassMap: Record<TypographyWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
  black: 'font-black',
};

const colorClassMap: Record<TypographyColor, string> = {
  default: 'text-text',
  muted: 'text-text/70',
  primary: 'text-primary',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  amber: 'text-amber-500',
  inherit: 'text-inherit',
  white: 'text-white',
};

/**
 * Standardized polymorphic Typography component respecting the central PRODX typography scale
 */
export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = 'body-md',
      as,
      weight,
      color = 'default',
      truncate = false,
      uppercase = false,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const Component = as || defaultElementMap[variant] || 'div';
    const variantClass = variantClassMap[variant] || '';
    const weightClass = weight ? weightClassMap[weight] : '';
    const colorClass = colorClassMap[color] || '';
    const truncateClass = truncate ? 'truncate' : '';
    const uppercaseClass = uppercase ? 'uppercase tracking-wider' : '';

    return (
      <Component
        ref={ref}
        className={`${variantClass} ${weightClass} ${colorClass} ${truncateClass} ${uppercaseClass} ${className}`.trim()}
        {...rest}
      >
        {children}
      </Component>
    );
  }
);

Typography.displayName = 'Typography';

/* ========================================================================= */
/* Ergonomic Specialized Helper Components                                   */
/* ========================================================================= */

export interface DisplayProps extends Omit<TypographyProps, 'variant'> {
  size?: '2xl' | 'xl' | 'lg';
}

export const Display: React.FC<DisplayProps> = ({
  size = 'xl',
  as,
  className = '',
  children,
  ...props
}) => (
  <Typography
    variant={`display-${size}` as TypographyVariant}
    as={as || (size === 'lg' ? 'h2' : 'h1')}
    className={className}
    {...props}
  >
    {children}
  </Typography>
);

export interface HeadingProps extends Omit<TypographyProps, 'variant'> {
  level?: 1 | 2 | 3 | 4;
}

export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  as,
  className = '',
  children,
  ...props
}) => (
  <Typography
    variant={`heading-${level}` as TypographyVariant}
    as={as || (`h${level}` as React.ElementType)}
    className={className}
    {...props}
  >
    {children}
  </Typography>
);

export interface TextProps extends Omit<TypographyProps, 'variant'> {
  size?: 'lg' | 'md' | 'sm';
}

export const Text: React.FC<TextProps> = ({
  size = 'md',
  as = 'p',
  className = '',
  children,
  ...props
}) => (
  <Typography
    variant={`body-${size}` as TypographyVariant}
    as={as}
    className={className}
    {...props}
  >
    {children}
  </Typography>
);

export interface LabelProps extends Omit<TypographyProps, 'variant'> {
  size?: 'lg' | 'md' | 'sm' | 'xs';
  htmlFor?: string;
}

export const Label: React.FC<LabelProps> = ({
  size = 'md',
  as = 'label',
  className = '',
  children,
  ...props
}) => (
  <Typography
    variant={`label-${size}` as TypographyVariant}
    as={as}
    className={className}
    {...props}
  >
    {children}
  </Typography>
);

export interface CaptionProps extends Omit<TypographyProps, 'variant'> {
  size?: 'md' | 'sm';
}

export const Caption: React.FC<CaptionProps> = ({
  size = 'md',
  as = 'p',
  className = '',
  children,
  ...props
}) => (
  <Typography
    variant={size === 'sm' ? 'caption-sm' : 'caption'}
    as={as}
    color="muted"
    className={className}
    {...props}
  >
    {children}
  </Typography>
);

export interface MonoTextProps extends Omit<TypographyProps, 'variant'> {
  size?: 'lg' | 'md' | 'sm' | 'xs';
}

export const MonoText: React.FC<MonoTextProps> = ({
  size = 'md',
  as = 'span',
  className = '',
  children,
  ...props
}) => (
  <Typography
    variant={`mono-${size}` as TypographyVariant}
    as={as}
    className={className}
    {...props}
  >
    {children}
  </Typography>
);