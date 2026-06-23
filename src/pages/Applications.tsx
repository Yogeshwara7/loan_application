import { useEffect, useMemo, useState } from 'react';
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
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  SearchBox,
  TableCellLayout,
  Text,
  createTableColumn,
  makeStyles,
  tokens,
  type DataGridProps,
  type TableColumnDefinition,
} from '@fluentui/react-components';
import {
  MoreHorizontalRegular,
  EyeRegular,
  HistoryRegular,
  DocumentRegular,
  ArrowDownloadRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
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
    minWidth: '1040px',
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
});

const comparators: Record<string, (a: LoanApplication, b: LoanApplication) => number> = {
  reference: (a, b) => (a.cr174_referencenumber ?? '').localeCompare(b.cr174_referencenumber ?? ''),
  applicant: (a, b) => (a.cr174_applicantname ?? '').localeCompare(b.cr174_applicantname ?? ''),
  email: (a, b) => (a.cr174_applicantemail ?? '').localeCompare(b.cr174_applicantemail ?? ''),
  amount: (a, b) => (a.cr174_amount ?? 0) - (b.cr174_amount ?? 0),
  propertyValue: (a, b) => (a.cr174_propertyvalue ?? 0) - (b.cr174_propertyvalue ?? 0),
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

  const typeOptions = useMemo(
    () => ['all', ...loanTypeBreakdown(records).map((b) => b.label)],
    [records],
  );

  const goToDetails = (record: LoanApplication, hash = '') => {
    const id = record.cr174_loanapplicid ?? record.cr174_referencenumber ?? '';
    navigate(`/applications/${encodeURIComponent(id)}${hash}`);
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
        renderCell: (item) => <StatusBadge label={item._cr174_status_label} />,
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
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                size="small"
                icon={<MoreHorizontalRegular />}
                aria-label="Row actions"
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<EyeRegular />} onClick={() => goToDetails(item)}>
                  View
                </MenuItem>
                <MenuItem icon={<HistoryRegular />} onClick={() => goToDetails(item, '#timeline')}>
                  View Timeline
                </MenuItem>
                <MenuItem icon={<DocumentRegular />} onClick={() => goToDetails(item, '#documents')}>
                  View Documents
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
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
          <Button
            icon={<ArrowDownloadRegular />}
            onClick={() => downloadApplicationsCsv(sorted)}
            disabled={sorted.length === 0}
          >
            Export CSV
          </Button>
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
              <div className={styles.gridScroll}>
                <DataGrid
                  className={styles.grid}
                  items={pageItems}
                  columns={columns}
                  getRowId={getRowId}
                  sortable
                  sortState={sortState}
                  onSortChange={onSortChange}
                  resizableColumns
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
                      <DataGridRow<LoanApplication> key={rowId}>
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
