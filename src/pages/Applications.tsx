import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Spinner,
  TableCellLayout,
  Text,
  Tooltip,
  createTableColumn,
  makeStyles,
  tokens,
  type DataGridProps,
  type TableColumnDefinition,
  type TableColumnSizingOptions,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  ArrowClockwiseRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  AlertUrgentRegular,
} from '@fluentui/react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLoanData } from '../context/LoanDataContext';
import type { LoanApplication, StatusKind } from '../models/loan';
import {
  classifyStatus,
  formatCurrency,
  formatDate,
  loanTypeBreakdown,
} from '../models/loan';
import { downloadApplicationsCsv } from '../utils/export';
import { PageHeader } from '../components/PageHeader';
import { Surface } from '../components/Surface';
import { StatusBadge, DocumentsBadge } from '../components/StatusBadge';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type DatePreset = 'all' | '7' | '30' | '90';

const STATUS_OPTIONS: { key: StatusKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All statuses' },
  { key: 'approved', label: 'Approved' },
  { key: 'review', label: 'Under Review' },
  { key: 'resubmitted', label: 'ReSubmitted' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'received', label: 'Received' },
];

const DATE_OPTIONS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
];

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  filterBar: {
    position: 'sticky',
    top: tokens.spacingVerticalXS,
    zIndex: 2,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalM,
  },
  search: { minWidth: '220px', flexGrow: 1 },
  filterField: { minWidth: '150px' },
  spacer: { flexGrow: 1 },
  gridCard: {
    padding: 0,
    overflow: 'hidden',
  },
  gridScroll: {
    overflowX: 'auto',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  grid: {
    width: '100%',
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
    '& .fui-DataGridBody .fui-DataGridRow': {
      cursor: 'pointer',
    },
    '& .fui-DataGridBody .fui-DataGridRow:hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  pager: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  pagerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  statusCell: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  attentionIcon: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    fontSize: '16px',
    flexShrink: 0,
  },
});

const comparators: Record<string, (a: LoanApplication, b: LoanApplication) => number> = {
  reference: (a, b) => (a.cr174_referencenumber ?? '').localeCompare(b.cr174_referencenumber ?? ''),
  applicant: (a, b) => (a.cr174_applicantname ?? '').localeCompare(b.cr174_applicantname ?? ''),
  email: (a, b) => (a.cr174_applicantemail ?? '').localeCompare(b.cr174_applicantemail ?? ''),
  amount: (a, b) => (a.cr174_amount ?? 0) - (b.cr174_amount ?? 0),
  propertyValue: (a, b) => (a.cr174_propertyvalue ?? 0) - (b.cr174_propertyvalue ?? 0),
  collegeName: (a, b) => (a.cr174_collegename ?? '').localeCompare(b.cr174_collegename ?? ''),
  loanType: (a, b) => (a._cr174_loantype_label ?? '').localeCompare(b._cr174_loantype_label ?? ''),
  status: (a, b) => (a._cr174_status_label ?? '').localeCompare(b._cr174_status_label ?? ''),
  documents: (a, b) =>
    Number(a.cr174_documentsuploaded ?? false) - Number(b.cr174_documentsuploaded ?? false),
  created: (a, b) =>
    new Date(a.cr174_createddate ?? 0).getTime() - new Date(b.cr174_createddate ?? 0).getTime(),
};

export function Applications() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { records, status, reload } = useLoanData();
  const [searchParams] = useSearchParams();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<StatusKind | 'all'>(
    (searchParams.get('status') as StatusKind | null) ?? 'all',
  );
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DatePreset>('all');
  const [page, setPage] = useState(0);
  const [sortState, setSortState] = useState<Parameters<NonNullable<DataGridProps['onSortChange']>>[1]>(
    { sortColumn: 'created', sortDirection: 'descending' },
  );

  // Track the scroll container's width so columns can fill it proportionally.
  const [containerWidth, setContainerWidth] = useState(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const setScrollRef = useCallback((el: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    observer.observe(el);
    resizeObserverRef.current = observer;
  }, []);

  // Proportional column widths that fill the available width (Email widest;
  // status/documents/date compact; actions minimal). Recomputed on resize, with
  // per-column minimums that trigger horizontal scroll only on narrow screens.
  const columnSizingOptions = useMemo<TableColumnSizingOptions>(() => {
    const ACTIONS_WIDTH = 48;
    const weights: Record<string, { weight: number; min: number }> = {
      reference: { weight: 1.4, min: 150 },
      applicant: { weight: 1.2, min: 120 },
      email: { weight: 1.9, min: 180 },
      amount: { weight: 0.8, min: 92 },
      propertyValue: { weight: 0.8, min: 92 },
      collegeName: { weight: 1.1, min: 120 },
      loanType: { weight: 1.0, min: 110 },
      status: { weight: 0.8, min: 92 },
      documents: { weight: 0.8, min: 96 },
      created: { weight: 0.9, min: 104 },
    };
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w.weight, 0);
    const available = Math.max(0, (containerWidth || 1180) - ACTIONS_WIDTH - 6);
    const unit = available / totalWeight;
    const options: TableColumnSizingOptions = {
      actions: { minWidth: ACTIONS_WIDTH, idealWidth: ACTIONS_WIDTH },
    };
    for (const [columnId, { weight, min }] of Object.entries(weights)) {
      options[columnId] = { minWidth: min, idealWidth: Math.max(min, Math.floor(unit * weight)) };
    }
    return options;
  }, [containerWidth]);

  const typeOptions = useMemo(
    () => ['all', ...loanTypeBreakdown(records).map((b) => b.label)],
    [records],
  );

  const goToDetails = (record: LoanApplication) => {
    const id = record.cr174_loanapplicid ?? record.cr174_referencenumber ?? '';
    navigate(`/admin/applications/${encodeURIComponent(id)}`);
  };

  const columns: TableColumnDefinition<LoanApplication>[] = useMemo(
    () => [
      createTableColumn<LoanApplication>({
        columnId: 'reference',
        compare: comparators.reference,
        renderHeaderCell: () => 'Reference #',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.cr174_referencenumber ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'applicant',
        compare: comparators.applicant,
        renderHeaderCell: () => 'Applicant Name',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.cr174_applicantname ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'email',
        compare: comparators.email,
        renderHeaderCell: () => 'Email',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.cr174_applicantemail ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'amount',
        compare: comparators.amount,
        renderHeaderCell: () => 'Loan Amount',
        renderCell: (item) => <TableCellLayout>{formatCurrency(item.cr174_amount)}</TableCellLayout>,
      }),
      createTableColumn<LoanApplication>({
        columnId: 'propertyValue',
        compare: comparators.propertyValue,
        renderHeaderCell: () => 'Property Value',
        renderCell: (item) => (
          <TableCellLayout>{formatCurrency(item.cr174_propertyvalue)}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'collegeName',
        compare: comparators.collegeName,
        renderHeaderCell: () => 'College Name',
        renderCell: (item) => (
          <TableCellLayout truncate>{item.cr174_collegename || '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'loanType',
        compare: comparators.loanType,
        renderHeaderCell: () => 'Loan Type',
        renderCell: (item) => (
          <TableCellLayout truncate>{item._cr174_loantype_label ?? '—'}</TableCellLayout>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'status',
        compare: comparators.status,
        renderHeaderCell: () => 'Status',
        renderCell: (item) => (
          <span className={styles.statusCell}>
            <StatusBadge label={item._cr174_status_label} />
            {classifyStatus(item._cr174_status_label) === 'resubmitted' && (
              <Tooltip content="Needs attention — resubmitted by the applicant" relationship="label">
                <AlertUrgentRegular className={styles.attentionIcon} aria-label="Needs attention" />
              </Tooltip>
            )}
          </span>
        ),
      }),
      createTableColumn<LoanApplication>({
        columnId: 'documents',
        compare: comparators.documents,
        renderHeaderCell: () => 'Documents',
        renderCell: (item) => <DocumentsBadge uploaded={item.cr174_documentsuploaded} />,
      }),
      createTableColumn<LoanApplication>({
        columnId: 'created',
        compare: comparators.created,
        renderHeaderCell: () => 'Created Date',
        renderCell: (item) => <TableCellLayout>{formatDate(item.cr174_createddate)}</TableCellLayout>,
      }),
      createTableColumn<LoanApplication>({
        columnId: 'actions',
        renderHeaderCell: () => '',
        renderCell: (item) => (
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronRightRegular />}
            aria-label={`View details for ${item.cr174_referencenumber ?? 'application'}`}
            onClick={(e) => {
              e.stopPropagation();
              goToDetails(item);
            }}
          />
        ),
      }),
    ],
    // navigate is stable; goToDetails closes over it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    const cutoff = dateFilter === 'all' ? 0 : now - Number(dateFilter) * DAY_MS;
    return records.filter((r) => {
      if (statusFilter !== 'all' && classifyStatus(r._cr174_status_label) !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && (r._cr174_loantype_label ?? '').trim() !== typeFilter) {
        return false;
      }
      if (cutoff > 0) {
        const t = new Date(r.cr174_createddate ?? 0).getTime();
        if (Number.isNaN(t) || t < cutoff) return false;
      }
      if (q) {
        const haystack = [
          r.cr174_referencenumber,
          r.cr174_applicantname,
          r.cr174_applicantemail,
          r.cr174_collegename,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, query, statusFilter, typeFilter, dateFilter]);

  const sorted = useMemo(() => {
    const compare = comparators[sortState.sortColumn as string];
    if (!compare) return filtered;
    const dir = sortState.sortDirection === 'ascending' ? 1 : -1;
    return [...filtered].sort((a, b) => compare(a, b) * dir);
  }, [filtered, sortState]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageItems = useMemo(
    () => sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [sorted, safePage],
  );

  // Reset to first page whenever the filtered/sorted result set changes.
  useEffect(() => {
    setPage(0);
  }, [query, statusFilter, typeFilter, dateFilter, sortState]);

  const getRowId = (item: LoanApplication) =>
    item.cr174_loanapplicid ?? item.cr174_referencenumber ?? '';

  const onSortChange: DataGridProps['onSortChange'] = (_e, next) => setSortState(next);

  return (
    <div className={styles.root}>
      <PageHeader
        title="Applications"
        subtitle="Search, filter and manage every loan application."
        actions={
          <>
            <Button
              icon={refreshing ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button
              icon={<ArrowDownloadRegular />}
              onClick={() => downloadApplicationsCsv(sorted)}
              disabled={sorted.length === 0}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <Surface className={styles.filterBar} padded>
        <Field label="Search" className={styles.search}>
          <SearchBox
            placeholder="Reference, applicant, email…"
            value={query}
            onChange={(_e, data) => setQuery(data.value)}
          />
        </Field>
        <Field label="Status" className={styles.filterField}>
          <Dropdown
            value={STATUS_OPTIONS.find((o) => o.key === statusFilter)?.label ?? 'All statuses'}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_e, d) => setStatusFilter((d.optionValue as StatusKind | 'all') ?? 'all')}
          >
            {STATUS_OPTIONS.map((o) => (
              <Option key={o.key} value={o.key} text={o.label}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Loan Type" className={styles.filterField}>
          <Dropdown
            value={typeFilter === 'all' ? 'All types' : typeFilter}
            selectedOptions={[typeFilter]}
            onOptionSelect={(_e, d) => setTypeFilter(d.optionValue ?? 'all')}
          >
            {typeOptions.map((t) => (
              <Option key={t} value={t} text={t === 'all' ? 'All types' : t}>
                {t === 'all' ? 'All types' : t}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Date range" className={styles.filterField}>
          <Dropdown
            value={DATE_OPTIONS.find((o) => o.key === dateFilter)?.label ?? 'All time'}
            selectedOptions={[dateFilter]}
            onOptionSelect={(_e, d) => setDateFilter((d.optionValue as DatePreset) ?? 'all')}
          >
            {DATE_OPTIONS.map((o) => (
              <Option key={o.key} value={o.key} text={o.label}>
                {o.label}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </Surface>

      {status === 'loading' && <LoadingSkeleton variant="list" count={8} />}

      {status === 'error' && (
        <Surface padded={false}>
          <ErrorState title="Couldn't load applications" onRetry={() => void reload()} />
        </Surface>
      )}

      {status === 'ready' && (
        <>
          <Surface className={styles.gridCard} padded={false}>
            {sorted.length === 0 ? (
              <EmptyState
                title="No matching applications"
                message="Try adjusting your search or filters."
              />
            ) : (
              <div className={styles.gridScroll} ref={setScrollRef}>
                <DataGrid
                  // Re-initialise column sizing when the container width changes
                  // (in coarse buckets) so the grid always fills the available
                  // width — resizableColumns otherwise ignores later updates.
                  key={`grid-${Math.round(containerWidth / 16)}`}
                  className={styles.grid}
                  items={pageItems}
                  columns={columns}
                  getRowId={getRowId}
                  sortable
                  sortState={sortState}
                  onSortChange={onSortChange}
                  resizableColumns
                  columnSizingOptions={columnSizingOptions}
                  focusMode="composite"
                  aria-label="Loan applications"
                >
                  <DataGridHeader>
                    <DataGridRow>
                      {({ renderHeaderCell }) => (
                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                      )}
                    </DataGridRow>
                  </DataGridHeader>
                  <DataGridBody<LoanApplication>>
                    {({ item, rowId }) => (
                      <DataGridRow<LoanApplication>
                        key={rowId}
                        onClick={() => goToDetails(item)}
                      >
                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
              </div>
            )}
          </Surface>

          {sorted.length > 0 && (
            <div className={styles.pager}>
              <Text className={styles.muted}>
                <Badge appearance="tint" color="brand">
                  {sorted.length}
                </Badge>{' '}
                application{sorted.length === 1 ? '' : 's'} · page {safePage + 1} of {pageCount}
              </Text>
              <div className={styles.pagerControls}>
                <Button
                  appearance="subtle"
                  icon={<ChevronLeftRegular />}
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  appearance="subtle"
                  icon={<ChevronRightRegular />}
                  iconPosition="after"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Applications;
