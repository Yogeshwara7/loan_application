import { Caption1, Text, makeStyles, tokens } from '@fluentui/react-components';

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: readonly DonutDatum[];
  size?: number;
  thickness?: number;
  centerValue?: string | number;
  centerLabel?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXL,
  },
  chartWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  center: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalXXS,
  },
  centerValue: {
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeHero700,
    lineHeight: '1',
  },
  centerLabel: {
    color: tokens.colorNeutralForeground3,
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    minWidth: '140px',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: tokens.borderRadiusCircular,
    flexShrink: 0,
  },
  legendLabel: {
    flexGrow: 1,
    color: tokens.colorNeutralForeground2,
  },
  legendValue: {
    fontWeight: tokens.fontWeightSemibold,
  },
});

/** Dependency-free SVG donut chart driven by Fluent colour tokens. */
export function DonutChart({
  data,
  size = 190,
  thickness = 22,
  centerValue,
  centerLabel,
}: DonutChartProps) {
  const styles = useStyles();
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = total === 0 ? 0 : d.value / total;
      const length = fraction * circumference;
      const seg = { ...d, length, dashOffset: offset };
      offset += length;
      return seg;
    });

  return (
    <div className={styles.root}>
      <div className={styles.chartWrap} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Loan status distribution">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={tokens.colorNeutralBackground4}
            strokeWidth={thickness}
          />
          {segments.map((seg) => (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(seg.length - 2, 0)} ${circumference}`}
              strokeDashoffset={-seg.dashOffset}
              transform={`rotate(-90 ${center} ${center})`}
            />
          ))}
        </svg>
        {(centerValue !== undefined || centerLabel) && (
          <div className={styles.center}>
            {centerValue !== undefined && <span className={styles.centerValue}>{centerValue}</span>}
            {centerLabel && <Caption1 className={styles.centerLabel}>{centerLabel}</Caption1>}
          </div>
        )}
      </div>

      <div className={styles.legend}>
        {data.map((d) => (
          <div key={d.label} className={styles.legendRow}>
            <span className={styles.dot} style={{ backgroundColor: d.color }} aria-hidden />
            <Text className={styles.legendLabel} size={300}>
              {d.label}
            </Text>
            <Text className={styles.legendValue} size={300}>
              {d.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DonutChart;
