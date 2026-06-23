import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { HTMLAttributes, ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    borderRadius: tokens.borderRadiusXLarge,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    // Glassmorphism-inspired translucent surface that adapts to light/dark via
    // the neutral background token. color-mix is supported in the Edge/Chromium
    // runtime that hosts Power Apps code apps.
    backgroundColor: `color-mix(in srgb, ${tokens.colorNeutralBackground1} 82%, transparent)`,
    backdropFilter: 'blur(20px)',
    boxShadow: tokens.shadow8,
    boxSizing: 'border-box',
  },
  padded: {
    padding: tokens.spacingHorizontalXL,
  },
  interactive: {
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'box-shadow, transform, border-color',
    transitionTimingFunction: tokens.curveEasyEase,
    ':hover': {
      boxShadow: tokens.shadow16,
      transform: 'translateY(-2px)',
      ...shorthands.borderColor(tokens.colorNeutralStroke1),
    },
  },
});

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Apply default interior padding. Default true. */
  padded?: boolean;
  /** Add hover elevation/lift. Default false. */
  interactive?: boolean;
}

/** Reusable glass-style card surface used across the redesigned app. */
export function Surface({
  children,
  padded = true,
  interactive = false,
  className,
  ...rest
}: SurfaceProps) {
  const styles = useStyles();
  return (
    <div
      className={mergeClasses(
        styles.root,
        padded && styles.padded,
        interactive && styles.interactive,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Surface;
