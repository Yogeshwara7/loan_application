import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  Option,
  SearchBox,
  TableCellLayout,
  Text,
  OverlayDrawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
  createTableColumn,
  makeStyles,
  tokens,
  type TableColumnDefinition,
  type TableColumnSizingOptions,
} from '@fluentui/react-components';
import {
  ArrowClockwiseRegular,
  DismissRegular,
  ErrorCircleRegular,
  MailRegular,
  ClipboardTaskListLtrRegular,
  HistoryRegular,
  ClockRegular,
} from '@fluentui/react-icons';
import { FlowErrorLogsService } from '../generated';
import { formatRelative, toErrorMessage } from '../models/loan';
import {
  classifyFlow,
  computeErrorMetrics,
  distinctFlowNames,
  formatDateTime,
  logId,
  logTimestamp,
  type ErrorLog,
} from '../models/errorLog';
import { PageHeader } from '../components/PageHeader';
import { Surface } from '../components/Surface';
import { KpiCard } from '../components/KpiCard';
import { DetailList } from '../components/DetailList';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type LoadStatus = 'loading' | 'error' | 'ready';

const ALL_FLOWS = '__all__';

const columnSizingOptions: TableColumnSizingOptions = {
  timestamp: { minWidth: 150, idealWidth: 180 },
  flowName: { minWidth: 150, idealWidth: 210 },
  applicant: { minWidth: 130, idealWidth: 170 },
  reference: { minWidth: 160, idealWidth: 200 },
  errorMessage: { minWidth: 240, idealWidth: 560 },
};

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
  },
  search: { minWidth: '240px', flexGrow: 1 },
  filterField: { minWidth: '200px' },
  gridCard: { padding: 0, overflow: 'hidden' },
  gridScroll: { overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' },
  grid: {
    width: '100%',
    minWidth: '920px',
    '& .fui-DataGridHeader': {
      position: 'sticky',
      top: 0,
      zIndex: 1,
      backgroundColor: tokens.colorNeutralBackground1,
    },
    '& .fui-DataGridHeaderCell': {
      fontWeight: tokens.fontWeightSemibold,
      color: tokens.colorNeutralForeground2,
    },
    '& .fui-DataGridBody .fui-DataGridRow': { cursor: 'pointer' },
    '& .fui-DataGridBody .fui-DataGridRow:hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  mono: { fontFamily: tokens.fontFamilyMonospace },
  errorText: { color: tokens.colorPaletteRedForeground1 },
  drawerSectionTitle: {
    display: 'block',
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground2,
  },
  drawerMessage: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `3px solid ${tokens.colorPaletteRedBorderActive}`,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
});

export function Admin() {
  const styles = useStyles();

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [flowFilter, setFlowFilter] = useState<string>(ALL_FLOWS);
  const [selected, setSelected] = useState<ErrorLog | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      // Use the generated SharePoint datasource service directly.
      const result = await FlowErrorLogsService.getAll();
      if (!result.success) {
        throw result.error ?? new Error('The service returned an unsuccessful response.');
      }
      const rows = [...(result.data ?? [])].sort(
        (a, b) =>
          new Date(logTimestamp(b) ?? 0).getTime() - new Date(logTimestamp(a) ?? 0).getTime(),
      );
      setLogs(rows);
      setStatus('ready');
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load flow error logs from SharePoint.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Intentional one-time fetch on mount; `load` manages its own state machine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const metrics = useMemo(() => computeErrorMetrics(logs), [logs]);
  const flowNames = useMemo(() => distinctFlowNames(logs), [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (flowFilter !== ALL_FLOWS && (log.FlowName ?? '') !== flowFilter) return false;
      if (q) {
        const haystack = [
          log.FlowName,
          log.Applicant_x0020_Name,
          log.ReferenceNumber,
          log.ErrorMessage,
          log.Title,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, query, flowFilter]);

  const columns: TableColumnDefinition<ErrorLog>[] = useMemo(
    () => [
      createTableColumn<ErrorLog>({
        columnId: 'timestamp',
        compare: (a, b) =>
          new Date(logTimestamp(a) ?? 0).getTime() - new Date(logTimestamp(b) ?? 0).getTime(),
        renderHeaderCell: () => 'Timestamp',
        renderCell: (item) => <TableCellLayout>{formatDateTime(logTimestamp(item))}</TableCellLayout>,
      }),
      createTableColumn<ErrorLog>({
        columnId: 'flowName',
        compare: (a, b) => (a.FlowName ?? '').localeCompare(b.FlowName ?? ''),
        renderHeaderCell: () => 'Flow Name',
        renderCell: (item) => <TableCellLayout truncate>{item.FlowName ?? '—'}</TableCellLayout>,
      }),
      createTableColumn<ErrorLog>({
        columnId: 'applicant',
        compare: (a, b) =>
          (a.Applicant_x0020_Name ?? '').localeCompare(b.Applicant_x0020_Name ?? ''),
        renderHeaderCell: () => 'Applicant Name',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.Applicant_x0020_Name ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<ErrorLog>({
        columnId: 'reference',
        compare: (a, b) => (a.ReferenceNumber ?? '').localeCompare(b.ReferenceNumber ?? ''),
        renderHeaderCell: () => 'Reference Number',
        renderCell: (item) => (
          <TableCellLayout truncate>
            <span className={styles.mono}>{item.ReferenceNumber ?? '—'}</span>
          </TableCellLayout>
        ),
      }),
      createTableColumn<ErrorLog>({
        columnId: 'errorMessage',
        compare: (a, b) => (a.ErrorMessage ?? '').localeCompare(b.ErrorMessage ?? ''),
        renderHeaderCell: () => 'Error Message',
        renderCell: (item) => (
          <TableCellLayout truncate>
            <span className={styles.errorText}>{item.ErrorMessage ?? '—'}</span>
          </TableCellLayout>
        ),
      }),
    ],
    // styles is stable; column renderers only close over module helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className={styles.root}>
      <PageHeader
        title="Admin — Flow Error Logs"
        subtitle="Monitor Power Automate flow failures across the loan workflow."
        actions={
          <Button
            icon={<ArrowClockwiseRegular />}
            onClick={() => void load()}
            disabled={status === 'loading'}
          >
            Refresh
          </Button>
        }
      />

      {status === 'loading' ? (
        <LoadingSkeleton variant="cards" count={5} />
      ) : (
        <section className={styles.kpiGrid} aria-label="Error metrics">
          <KpiCard label="Total Errors" value={metrics.total} icon={<ErrorCircleRegular />} tone="danger" />
          <KpiCard label="Email Failures" value={metrics.email} icon={<MailRegular />} tone="warning" />
          <KpiCard
            label="Approval Failures"
            value={metrics.approval}
            icon={<ClipboardTaskListLtrRegular />}
            tone="orange"
          />
          <KpiCard label="Timeline Failures" value={metrics.timeline} icon={<HistoryRegular />} tone="info" />
          <KpiCard
            label="Latest Error"
            value={metrics.latest ? formatRelative(metrics.latest) : '—'}
            icon={<ClockRegular />}
            tone="neutral"
            secondary={metrics.latest ? formatDateTime(metrics.latest) : 'No errors logged'}
          />
        </section>
      )}

      <Surface className={styles.filterBar}>
        <Field label="Search" className={styles.search}>
          <SearchBox
            placeholder="Flow, applicant, reference, message…"
            value={query}
            onChange={(_e, d) => setQuery(d.value)}
            disabled={status !== 'ready'}
          />
        </Field>
        <Field label="Flow Name" className={styles.filterField}>
          <Dropdown
            value={flowFilter === ALL_FLOWS ? 'All flows' : flowFilter}
            selectedOptions={[flowFilter]}
            onOptionSelect={(_e, d) => setFlowFilter(d.optionValue ?? ALL_FLOWS)}
            disabled={status !== 'ready'}
          >
            <Option value={ALL_FLOWS} text="All flows">
              All flows
            </Option>
            {flowNames.map((name) => (
              <Option key={name} value={name} text={name}>
                {name}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </Surface>

      {status === 'loading' && <LoadingSkeleton variant="list" count={8} />}

      {status === 'error' && (
        <Surface padded={false}>
          <ErrorState title="Couldn't load error logs" message={error} onRetry={() => void load()} />
        </Surface>
      )}

      {status === 'ready' && (
        <Surface className={styles.gridCard} padded={false}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ErrorCircleRegular />}
              title={logs.length === 0 ? 'No errors logged' : 'No matching errors'}
              message={
                logs.length === 0
                  ? 'Flow failures will appear here when they occur.'
                  : 'Try adjusting your search or flow filter.'
              }
            />
          ) : (
            <div className={styles.gridScroll}>
              <DataGrid
                className={styles.grid}
                items={filtered}
                columns={columns}
                getRowId={(item) => logId(item)}
                sortable
                defaultSortState={{ sortColumn: 'timestamp', sortDirection: 'descending' }}
                resizableColumns
                columnSizingOptions={columnSizingOptions}
                focusMode="composite"
                aria-label="Flow error logs"
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<ErrorLog>>
                  {({ item, rowId }) => (
                    <DataGridRow<ErrorLog> key={rowId} onClick={() => setSelected(item)}>
                      {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
          )}
        </Surface>
      )}

      <OverlayDrawer
        position="end"
        size="medium"
        open={selected !== null}
        onOpenChange={(_e, d) => {
          if (!d.open) setSelected(null);
        }}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<DismissRegular />}
                onClick={() => setSelected(null)}
              />
            }
          >
            Error details
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {selected && (
            <>
              <DetailList
                items={[
                  { label: 'Timestamp', value: formatDateTime(logTimestamp(selected)) },
                  { label: 'Flow Name', value: selected.FlowName ?? '—' },
                  {
                    label: 'Category',
                    value: (
                      <Badge appearance="tint" color="informative">
                        {classifyFlow(selected)}
                      </Badge>
                    ),
                  },
                  { label: 'Applicant Name', value: selected.Applicant_x0020_Name ?? '—' },
                  {
                    label: 'Reference Number',
                    value: <span className={styles.mono}>{selected.ReferenceNumber ?? '—'}</span>,
                  },
                  { label: 'Log ID', value: logId(selected) || '—' },
                  { label: 'Created', value: formatDateTime(selected.Created) },
                ]}
              />
              <Text className={styles.drawerSectionTitle} weight="semibold">
                Error message
              </Text>
              <div className={styles.drawerMessage}>
                <Text>{selected.ErrorMessage || 'No error message recorded.'}</Text>
              </div>
              {selected.Title && (
                <>
                  <Text className={styles.drawerSectionTitle} weight="semibold">
                    Title
                  </Text>
                  <Text>{selected.Title}</Text>
                </>
              )}
            </>
          )}
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}

export default Admin;
