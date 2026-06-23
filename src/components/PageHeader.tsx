import { Body1, Title2, makeStyles, tokens } from '@fluentui/react-components';
import type { ReactNode } from 'react';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
});

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/** Consistent page title block with optional subtitle and right-aligned actions. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.text}>
        <Title2>{title}</Title2>
        {subtitle && <Body1 className={styles.subtitle}>{subtitle}</Body1>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

export default PageHeader;
