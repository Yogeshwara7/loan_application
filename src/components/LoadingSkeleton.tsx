import { Skeleton, SkeletonItem, makeStyles, tokens } from '@fluentui/react-components';
import { Surface } from './Surface';

const useStyles = makeStyles({
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: '136px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  grow: {
    flexGrow: 1,
  },
  block: {
    height: '320px',
  },
});

export type SkeletonVariant = 'cards' | 'list' | 'block';

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  /** Number of repeated items for cards/list variants. */
  count?: number;
}

/** Content-shaped loading skeletons (cards, list rows, large block). */
export function LoadingSkeleton({ variant = 'list', count = 4 }: LoadingSkeletonProps) {
  const styles = useStyles();
  const items = Array.from({ length: count });

  if (variant === 'cards') {
    return (
      <div className={styles.cardGrid} role="status" aria-live="polite" aria-label="Loading">
        {items.map((_, index) => (
          <Surface key={index} className={styles.card}>
            <Skeleton>
              <SkeletonItem shape="square" size={40} />
            </Skeleton>
            <Skeleton>
              <SkeletonItem size={40} style={{ width: '60%' }} />
            </Skeleton>
            <Skeleton>
              <SkeletonItem size={16} style={{ width: '80%' }} />
            </Skeleton>
          </Surface>
        ))}
      </div>
    );
  }

  if (variant === 'block') {
    return (
      <Surface role="status" aria-live="polite" aria-label="Loading">
        <Skeleton>
          <SkeletonItem className={styles.block} />
        </Skeleton>
      </Surface>
    );
  }

  return (
    <Surface role="status" aria-live="polite" aria-label="Loading">
      <div className={styles.list}>
        {items.map((_, index) => (
          <div key={index} className={styles.listRow}>
            <Skeleton>
              <SkeletonItem shape="circle" size={32} />
            </Skeleton>
            <Skeleton className={styles.grow}>
              <SkeletonItem size={16} />
            </Skeleton>
            <Skeleton style={{ width: '80px' }}>
              <SkeletonItem size={24} />
            </Skeleton>
          </div>
        ))}
      </div>
    </Surface>
  );
}

export default LoadingSkeleton;
