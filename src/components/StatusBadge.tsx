import { Badge, makeStyles, tokens } from '@fluentui/react-components';
import { statusBadgeColor, statusText } from '../models/loan';

const useStyles = makeStyles({
  pill: {
    height: 'auto',
    minHeight: '26px',
    whiteSpace: 'nowrap',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXXS,
    fontWeight: tokens.fontWeightSemibold,
  },
});

export interface StatusBadgeProps {
  label?: string | null;
  size?: 'small' | 'medium' | 'large';
}

/** Consistent status pill (Approved=green, Rejected=red, Review=amber, Received=blue). */
export function StatusBadge({ label, size = 'large' }: StatusBadgeProps) {
  const styles = useStyles();
  return (
    <Badge
      className={styles.pill}
      appearance="filled"
      color={statusBadgeColor(label)}
      size={size}
      shape="rounded"
    >
      {statusText(label)}
    </Badge>
  );
}

export interface DocumentsBadgeProps {
  uploaded?: boolean | null;
  size?: 'small' | 'medium' | 'large';
}

/** Documents pill: Uploaded = green, Pending = neutral. */
export function DocumentsBadge({ uploaded, size = 'medium' }: DocumentsBadgeProps) {
  return (
    <Badge appearance="tint" color={uploaded ? 'success' : 'subtle'} size={size}>
      {uploaded ? 'Uploaded' : 'Pending'}
    </Badge>
  );
}

export default StatusBadge;
