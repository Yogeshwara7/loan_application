import { Text, makeStyles, tokens } from '@fluentui/react-components';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

export interface BarChartProps {
  data: readonly BarDatum[];
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  rowHead: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
  },
  label: {
    color: tokens.colorNeutralForeground2,
  },
  value: {
    fontWeight: tokens.fontWeightSemibold,
  },
  track: {
    height: '10px',
    width: '100%',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: tokens.borderRadiusCircular,
    transitionDuration: tokens.durationSlow,
    transitionProperty: 'width',
    transitionTimingFunction: tokens.curveEasyEase,
    minWidth: '4px',
  },
});

/** Dependency-free horizontal bar chart driven by Fluent colour tokens. */
export function BarChart({ data }: BarChartProps) {
  const styles = useStyles();
  const max = data.reduce((m, d) => Math.max(m, d.value), 0) || 1;

  return (
    <div className={styles.root}>
      {data.map((d) => (
        <div key={d.label} className={styles.row}>
          <div className={styles.rowHead}>
            <Text className={styles.label} size={300}>
              {d.label}
            </Text>
            <Text className={styles.value} size={300}>
              {d.value}
            </Text>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
              role="img"
              aria-label={`${d.label}: ${d.value}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default BarChart;
