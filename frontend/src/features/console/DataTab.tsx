'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { PreviewCard } from '@base-ui/react/preview-card'
import {
  ArrowDown,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Columns3,
  Loader2,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PageResponse } from './types'
import { DataPagination } from './DataPagination'

export type Column<T> = {
  key: string
  label: string
  value: (row: T) => string
  render?: (row: T) => React.ReactNode
  cellClassName?: string
  headClassName?: string
  defaultWidth: number
  skeleton?: string
  /** Backend field id this column maps to; when set, the column is offered as a search scope. */
  searchKey?: string
  sortKey: string
  initialSortDirection?: 'asc' | 'desc'
  defaultVisible?: boolean
  mobileContent?: boolean
}

type DataTabProps<T> = {
  columns: Column<T>[]
  columnWidthsKey: string
  rowKey: (row: T) => string
  load: (page: number, size: number, q?: string, field?: string, sort?: string, direction?: string, exact?: boolean) => Promise<PageResponse<T>>
  /** Resolves the page index where a searched row lives in the unfiltered list, enabling the jump action. */
  locate?: (row: T, size: number, direction?: string) => Promise<number>
  /** When set, rows get a chevron toggle that reveals this content in a full-width row below. */
  expand?: (row: T) => React.ReactNode
  /** Reads the room name off a row so it can be shown once instead of as a per-row column. */
  roomAccessor?: (row: T) => string
  canEdit?: boolean
  onDelete?: (row: T) => Promise<unknown>
  emptyLabel: string
  defaultSortKey: string
  defaultSortDirection?: 'asc' | 'desc'
  forceLoading?: boolean
  onError: (message: string) => void
  toolbarFilters?: React.ReactNode
  filterKey?: string
  refreshKey?: number
}

const DEFAULT_PAGE_SIZE = 50
const SKELETON_ROWS = 10
const MIN_COLUMN_WIDTH = 64
const MAX_COLUMN_WIDTH = 640
const KEYBOARD_RESIZE_STEP = 16

type OverflowPreviewPayload = {
  getText: () => string
  isOverflowing: () => boolean
}

function hasOverflow(element: HTMLElement): boolean {
  if (element.clientWidth === 0 || element.clientHeight === 0) return false
  return element.scrollWidth - element.clientWidth > 1 || element.scrollHeight - element.clientHeight > 1
}

const SKELETON_BAR_WIDTHS = [
  'w-[85%]',
  'w-[58%]',
  'w-[72%]',
  'w-[46%]',
  'w-[90%]',
  'w-[64%]',
  'w-[78%]',
  'w-[52%]',
]

export function DataTab<T>({
  columns,
  columnWidthsKey,
  rowKey,
  load,
  locate,
  expand,
  roomAccessor,
  canEdit = false,
  onDelete,
  emptyLabel,
  defaultSortKey,
  defaultSortDirection = 'desc',
  forceLoading = false,
  onError,
  toolbarFilters,
  filterKey = '',
  refreshKey = 0,
}: DataTabProps<T>) {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE)
  const [data, setData] = useState<PageResponse<T> | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [field, setField] = useState('all')
  const [exactMatch, setExactMatch] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [columnWidthDrafts, setColumnWidthDrafts] = useState<Record<string, string>>({})
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [direction, setDirection] = useState<'desc' | 'asc'>(defaultSortDirection)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [jumpingId, setJumpingId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(columns.filter((column) => column.defaultVisible !== false).map((column) => column.key)),
  )
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => Object.fromEntries(columns.map((column) => [column.key, column.defaultWidth])),
  )
  const [hasCustomColumnWidths, setHasCustomColumnWidths] = useState(false)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [overflowPreviewHandle] = useState(() => PreviewCard.createHandle<OverflowPreviewPayload>())
  const topPaginationRef = useRef<HTMLElement>(null)
  const requestVersion = useRef(0)
  const lastFilterKey = useRef(filterKey)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const customColumnKeysRef = useRef(new Set<string>())
  const defaultColumnWidthsRef = useRef(Object.fromEntries(columns.map((column) => [column.key, column.defaultWidth])))
  const tableRef = useRef<HTMLTableElement | null>(null)
  const columnWidthsRef = useRef(columnWidths)
  const resizeRef = useRef<{
    key: string
    nextKey: string
    pointerId: number
    startX: number
    startWidth: number
    startNextWidth: number
  } | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefreshKey = useRef(refreshKey)
  const columnVisibilityStorageKey = `data-console.visible-columns.${columnWidthsKey}`
  const columnWidthsStorageKey = `data-console.column-widths.${columnWidthsKey}`

  const persistColumnWidths = useCallback((widths: Record<string, number>) => {
    try {
      const overrides = Object.fromEntries([...customColumnKeysRef.current].map((key) => [key, widths[key]]))
      localStorage.setItem(columnWidthsStorageKey, JSON.stringify(overrides))
    } catch {
      // Resizing remains available when storage is unavailable.
    }
  }, [columnWidthsStorageKey])

  const trackCustomWidth = useCallback((key: string, width: number) => {
    if (Math.abs(width - (defaultColumnWidthsRef.current[key] ?? width)) < 1) customColumnKeysRef.current.delete(key)
    else customColumnKeysRef.current.add(key)
    setHasCustomColumnWidths(customColumnKeysRef.current.size > 0)
  }, [])

  const updateColumnBoundary = useCallback((
    key: string,
    nextKey: string,
    startWidth: number,
    startNextWidth: number,
    requestedDelta: number,
    persist = false,
  ) => {
    const minimumDelta = Math.max(MIN_COLUMN_WIDTH - startWidth, startNextWidth - MAX_COLUMN_WIDTH)
    const maximumDelta = Math.min(MAX_COLUMN_WIDTH - startWidth, startNextWidth - MIN_COLUMN_WIDTH)
    const delta = Math.min(maximumDelta, Math.max(minimumDelta, requestedDelta))
    const width = Math.round(startWidth + delta)
    const next = { ...columnWidthsRef.current, [key]: width, [nextKey]: startWidth + startNextWidth - width }
    trackCustomWidth(key, next[key]!)
    trackCustomWidth(nextKey, next[nextKey]!)
    columnWidthsRef.current = next
    setColumnWidths(next)
    if (persist) persistColumnWidths(next)
  }, [persistColumnWidths, trackCustomWidth])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(columnWidthsStorageKey) ?? '{}') as Record<string, unknown>
      const validKeys = new Set(columns.map((column) => column.key))
      const restored = Object.fromEntries(
        Object.entries(stored && typeof stored === 'object' ? stored : {}).filter(
          ([key, width]) => validKeys.has(key) && typeof width === 'number' && Number.isFinite(width) && width >= MIN_COLUMN_WIDTH && width <= MAX_COLUMN_WIDTH,
        ),
      ) as Record<string, number>
      customColumnKeysRef.current = new Set(Object.keys(restored).filter((key) => Math.abs(restored[key]! - (defaultColumnWidthsRef.current[key] ?? restored[key]!)) >= 1))
      setHasCustomColumnWidths(customColumnKeysRef.current.size > 0)
      const merged = { ...columnWidthsRef.current, ...restored }
      columnWidthsRef.current = merged
      setColumnWidths(merged)
    } catch {
      // Keep defaults if storage is blocked or contains invalid data.
    }
  }, [columnWidthsStorageKey, columns])

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(columnVisibilityStorageKey) ?? 'null')
      if (Array.isArray(stored)) {
        const keys = stored.filter((key): key is string => typeof key === 'string' && columns.some((column) => column.key === key))
        if (keys.length) setVisibleColumnKeys(new Set(keys))
      }
    } catch {
      // Visibility controls remain usable without storage.
    }
  }, [columnVisibilityStorageKey, columns])

  const setExactColumnWidth = (column: Column<T>) => {
    const draft = columnWidthDrafts[column.key]
    const requested = draft?.trim() ? Number(draft) : Number.NaN
    if (Number.isFinite(requested)) {
      const width = Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(requested)))
      const next = { ...columnWidthsRef.current, [column.key]: width }
      trackCustomWidth(column.key, width)
      columnWidthsRef.current = next
      setColumnWidths(next)
      persistColumnWidths(next)
    }
    setColumnWidthDrafts((previous) => {
      const next = { ...previous }
      delete next[column.key]
      return next
    })
  }

  const resetColumnWidths = () => {
    const defaults = Object.fromEntries(columns.map((column) => [column.key, column.defaultWidth]))
    columnWidthsRef.current = defaults
    setColumnWidths(defaults)
    setColumnWidthDrafts({})
    customColumnKeysRef.current.clear()
    setHasCustomColumnWidths(false)
    try {
      localStorage.removeItem(columnWidthsStorageKey)
    } catch {
      // Reset still applies when storage is blocked.
    }
  }

  const resetColumnBoundary = (key: string, nextKey: string) => {
    const width = columnWidthsRef.current[key]
    const nextWidth = columnWidthsRef.current[nextKey]
    const defaultWidth = defaultColumnWidthsRef.current[key]
    if (width === undefined || nextWidth === undefined || defaultWidth === undefined) return
    updateColumnBoundary(key, nextKey, width, nextWidth, defaultWidth - width, true)
  }

  useEffect(() => () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const startColumnResize = (
    event: React.PointerEvent<HTMLDivElement>,
    key: string,
    nextKey: string,
  ) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const widths = { ...columnWidthsRef.current }
    tableRef.current?.querySelectorAll<HTMLElement>('[data-column-key]').forEach((header) => {
      const columnKey = header.dataset.columnKey
      if (columnKey) widths[columnKey] = header.getBoundingClientRect().width
    })
    const startWidth = widths[key]
    const startNextWidth = widths[nextKey]
    if (startWidth === undefined || startNextWidth === undefined) return
    columnWidthsRef.current = widths
    setColumnWidths(widths)
    resizeRef.current = {
      key,
      nextKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth,
      startNextWidth,
    }
    setResizingColumn(key)
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const resizeColumn = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    updateColumnBoundary(
      resize.key,
      resize.nextKey,
      resize.startWidth,
      resize.startNextWidth,
      event.clientX - resize.startX,
    )
  }

  const finishColumnResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    resizeRef.current = null
    setResizingColumn(null)
    persistColumnWidths(columnWidthsRef.current)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const resizeColumnWithKeyboard = (
    event: React.KeyboardEvent<HTMLDivElement>,
    key: string,
    nextKey: string,
  ) => {
    if (event.key === 'Home') {
      event.preventDefault()
      resetColumnBoundary(key, nextKey)
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const currentWidth = columnWidthsRef.current[key]
    const nextWidth = columnWidthsRef.current[nextKey]
    if (currentWidth === undefined || nextWidth === undefined) return
    updateColumnBoundary(
      key,
      nextKey,
      currentWidth,
      nextWidth,
      event.key === 'ArrowLeft' ? -KEYBOARD_RESIZE_STEP : KEYBOARD_RESIZE_STEP,
      true,
    )
  }

  const reload = useCallback(
    async (
      targetPage: number,
      targetSize: number,
      q: string,
      searchField: string,
      targetSortKey: string,
      dir: string,
      exact: boolean,
      // A silent reload keeps the current table visible and only spins the refresh icon,
      // instead of swapping the rows out for skeletons.
      opts?: { silent?: boolean },
    ) => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
      const request = ++requestVersion.current
      setLoading(!opts?.silent)
      setRefreshing(!!opts?.silent)
      setLoadError(false)
      try {
        let result = await load(
          targetPage,
          targetSize,
          q.trim() || undefined,
          searchField,
          targetSortKey || undefined,
          dir,
          exact,
        )
        if (request !== requestVersion.current) return false
        if (result.totalPages > 0 && result.page >= result.totalPages) {
          result = await load(result.totalPages - 1, targetSize, q.trim() || undefined, searchField, targetSortKey, dir, exact)
          if (request !== requestVersion.current) return false
        }
        if (result.totalPages === 0 && result.page > 0) result = { ...result, page: 0 }
        setData(result)
        setPage(result.page)
        setSize(result.size)
        return true
      } catch (error) {
        if (request !== requestVersion.current) return false
        setLoadError(true)
        onError(error instanceof Error ? error.message : 'Failed to load data.')
        return false
      } finally {
        if (request === requestVersion.current) {
          setRefreshing(false)
          setLoading(false)
        }
      }
    },
    [load, onError],
  )

  // Initial load only. Subsequent loads are triggered explicitly by user actions
  // (search, paging, page-size, sort, jump) so that a programmatic search-clear during a
  // jump can't reset the page back to 0. Guarded by a ref so it fires exactly once per mount:
  // `reload` is recreated whenever the parent passes a fresh inline `load` prop (e.g. on every
  // re-render), and without the guard that would re-trigger a skeleton load on each parent render.
  const didInitialLoad = useRef(false)
  useEffect(() => {
    if (forceLoading) return
    if (didInitialLoad.current) return
    didInitialLoad.current = true
    void reload(0, DEFAULT_PAGE_SIZE, '', 'all', sortKey, defaultSortDirection, false)
  }, [defaultSortDirection, forceLoading, reload, sortKey])

  useEffect(() => {
    if (forceLoading || !didInitialLoad.current || lastRefreshKey.current === refreshKey) return
    lastRefreshKey.current = refreshKey
    setActiveQuery(query)
    void reload(query === activeQuery ? page : 0, size, query, field, sortKey, direction, exactMatch, { silent: true })
  }, [activeQuery, direction, exactMatch, field, forceLoading, page, query, refreshKey, reload, size, sortKey])

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
      if (searchTimer.current) clearTimeout(searchTimer.current)
    },
    [],
  )

  useEffect(() => {
    if (forceLoading || !didInitialLoad.current || lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    setActiveQuery(query)
    void reload(0, size, query, field, sortKey, direction, exactMatch, { silent: true })
  }, [direction, exactMatch, field, filterKey, forceLoading, query, reload, size, sortKey])

  useEffect(() => {
    if (!highlightId || forceLoading) return
    rowRefs.current.get(highlightId)?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }, [data, forceLoading, highlightId])

  const onSearchChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) setExactMatch(false)
    setRefreshing(true)
    ++requestVersion.current
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setActiveQuery(value)
      void reload(0, size, value, field, sortKey, direction, value.trim() ? exactMatch : false, { silent: true })
    }, 300)
  }

  const onFieldChange = (next: string) => {
    setField(next)
    setActiveQuery(query)
    void reload(0, size, query, next, sortKey, direction, exactMatch, { silent: true })
  }

  const returnToPagination = () => {
    topPaginationRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
    topPaginationRef.current?.focus({ preventScroll: true })
  }

  const onSizeChange = async (next: number, fromBottom = false) => {
    if (await reload(0, next, activeQuery, field, sortKey, direction, exactMatch)) {
      if (fromBottom) returnToPagination()
    }
  }

  const onPageChange = async (next: number, fromBottom = false) => {
    if (await reload(next, size, activeQuery, field, sortKey, direction, exactMatch)) {
      if (fromBottom) returnToPagination()
    }
  }

  const onSort = (column: Column<T>) => {
    const nextDirection = sortKey === column.sortKey
      ? direction === 'asc' ? 'desc' : 'asc'
      : column.initialSortDirection ?? 'asc'
    setSortKey(column.sortKey)
    setDirection(nextDirection)
    setActiveQuery(query)
    void reload(0, size, query, field, column.sortKey, nextDirection, exactMatch, { silent: true })
  }

  const searching = activeQuery.trim().length > 0
  const busy = forceLoading || loading || refreshing
  const showLoading = forceLoading || ((loading || refreshing) && data === null)
  const rows = data?.content ?? []
  const visibleColumns = columns.filter((column) => visibleColumnKeys.has(column.key))
  const columnCount = visibleColumns.length + (expand ? 1 : 0) + (locate ? 1 : 0) + (canEdit ? 1 : 0)
  const firstRow = rows[0]
  const roomName = roomAccessor && firstRow ? roomAccessor(firstRow) : null
  const searchableColumns = columns.filter((c) => c.searchKey)
  const tableWidth = visibleColumns.reduce(
    (sum, column) => sum + (columnWidths[column.key] ?? column.defaultWidth),
    (expand ? 40 : 0) + (locate ? 48 : 0) + (canEdit ? 64 : 0),
  )
  const paginationProps = {
    page, size, rowCount: rows.length, totalElements: data?.totalElements,
    totalPages: data?.totalPages, loading: busy,
  }

  const toggleColumn = (key: string) => {
    setVisibleColumnKeys((previous) => {
      const next = new Set(previous)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      try {
        localStorage.setItem(columnVisibilityStorageKey, JSON.stringify([...next]))
      } catch {
        // Keep the current selection when storage is unavailable.
      }
      return next
    })
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const remove = async (row: T) => {
    if (!onDelete) return
    if (!confirm('Delete this row? This action cannot be undone.')) return
    try {
      await onDelete(row)
      await reload(page, size, activeQuery, field, sortKey, direction, exactMatch)
    } catch {
      onError('Failed to delete row.')
    }
  }

  const jumpTo = async (row: T) => {
    if (!locate) return
    const id = rowKey(row)
    setJumpingId(id)
    try {
      const targetPage = await locate(row, size, direction)
      if (searchTimer.current) clearTimeout(searchTimer.current)
      setQuery('')
      setActiveQuery('')
      setExactMatch(false)
      if (!await reload(targetPage, size, '', field, sortKey, direction, false)) return
      setHighlightId(id)
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
      highlightTimer.current = setTimeout(() => setHighlightId(null), 3000)
    } catch {
      onError('Failed to locate the selected row.')
    } finally {
      setJumpingId(null)
    }
  }

  return (
    <div className="data-tab flex min-w-0 flex-col gap-2 sm:gap-3">
      <div className="data-toolbar flex flex-wrap items-center gap-2 sm:justify-between">
        <div className="data-search flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {roomAccessor && (roomName || showLoading) &&
            (roomName ? (
              <Badge variant="outline" className="room-badge h-6 max-w-full font-normal whitespace-normal wrap-anywhere">
                Room: {roomName}
              </Badge>
            ) : (
              <Badge variant="outline" className="room-badge h-6 max-w-full font-normal whitespace-normal wrap-anywhere">
                <Skeleton className="h-3 w-20" />
              </Badge>
            ))}
          {searchableColumns.length > 0 && (
            <Select
              items={{
                all: 'All columns',
                ...Object.fromEntries(searchableColumns.map((c) => [c.searchKey!, c.label])),
              }}
              value={field}
              onValueChange={(v) => v && onFieldChange(v)}
            >
              <SelectTrigger size="sm" className="search-field h-7 w-[130px]" aria-label="Search column">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All columns</SelectItem>
                {searchableColumns.map((c) => (
                  <SelectItem key={c.searchKey} value={c.searchKey!}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="search-input relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Input
              className="h-7 w-full pr-7"
              aria-label="Search all rows"
              placeholder="Search all rows…"
              value={query}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {refreshing && (
              <Loader2
                className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-label="Loading"
              />
            )}
          </div>
          {searching && data && (
            <span className="text-xs text-muted-foreground">
              {data.totalElements} match{data.totalElements === 1 ? '' : 'es'} across all rows
            </span>
          )}
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground sm:min-h-8">
            <Switch
              checked={exactMatch}
              disabled={!query.trim()}
              onCheckedChange={(exact) => {
                setExactMatch(exact)
                setActiveQuery(query)
                void reload(0, size, query, field, sortKey, direction, exact, { silent: true })
              }}
            />
            Exact match
          </label>
          {toolbarFilters}
        </div>
        <div className="data-refresh flex items-center gap-1">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="sm">
                  <Columns3 />
                  Columns
                </Button>
              }
            />
            <PopoverContent side="bottom" align="end" className="w-80 max-w-[calc(100vw-1rem)] p-2">
              <div className="grid max-h-[60dvh] gap-1 overflow-y-auto">
                {columns.map((column) => {
                  const checked = visibleColumnKeys.has(column.key)
                  return (
                    <div key={column.key} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                      <span className="min-w-0 flex-1 truncate">{column.label}</span>
                      <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Input
                          type="number" inputMode="numeric" min={MIN_COLUMN_WIDTH} max={MAX_COLUMN_WIDTH} step={1}
                          className="h-7 w-20 text-right text-foreground"
                          aria-label={`${column.label} width in pixels`}
                          value={columnWidthDrafts[column.key] ?? Math.round(columnWidths[column.key] ?? column.defaultWidth).toString()}
                          onChange={(event) => setColumnWidthDrafts((previous) => ({ ...previous, [column.key]: event.target.value }))}
                          onBlur={() => setExactColumnWidth(column)}
                          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
                        />
                        px
                      </label>
                      <Switch
                        aria-label={`Show ${column.label} column`}
                        checked={checked}
                        disabled={checked && visibleColumnKeys.size === 1}
                        onCheckedChange={() => toggleColumn(column.key)}
                      />
                    </div>
                  )
                })}
                <Button variant="ghost" size="sm" className="justify-start" disabled={!hasCustomColumnWidths} onClick={resetColumnWidths}>Reset column widths</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => reload(page, size, activeQuery, field, sortKey, direction, exactMatch, { silent: true })}
          >
            <RotateCw className={busy ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="data-toolbar flex items-center gap-2 min-[1100px]:hidden">
        <Select
          items={Object.fromEntries(columns.map((column) => [column.key, column.label]))}
          value={columns.find((column) => column.sortKey === sortKey)?.key}
          onValueChange={(key) => { const column = columns.find((item) => item.key === key); if (column) onSort(column) }}
        >
          <SelectTrigger aria-label="Sort column" className="min-w-0 flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>{columns.map((column) => <SelectItem key={column.key} value={column.key}>{column.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { const column = columns.find((item) => item.sortKey === sortKey); if (column) onSort(column) }}>
          {direction === 'asc' ? <ArrowUp /> : <ArrowDown />}{direction === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>
      {loadError && (
        <div className="data-toolbar flex items-center gap-2 text-sm" role="status">
          Could not load records.
          <Button variant="outline" size="sm" onClick={() => reload(page, size, activeQuery, field, sortKey, direction, exactMatch)}>
            Retry
          </Button>
        </div>
      )}
      <DataPagination
        {...paginationProps}
        position="top"
        paginationRef={topPaginationRef}
        onPageChange={(next) => void onPageChange(next)}
        onSizeChange={(next) => void onSizeChange(next)}
      />

      <div className="data-table-frame min-w-0 overflow-hidden rounded-lg border" aria-busy={busy}>
        <Table
          ref={tableRef}
          data-column-layout-key={columnWidthsKey}
          data-column-widths-storage-key={columnWidthsStorageKey}
          style={{ width: `max(100%, ${tableWidth}px)` }}
          className="mobile-records min-w-[720px] table-fixed [&_td]:py-1.5 [&_th]:h-9 [&_tr]:border-border/50"
        >
          <TableHeader>
            <TableRow className="bg-muted/40">
              {expand && <TableHead className="w-[40px]" />}
              {visibleColumns.map((c, index) => {
                const nextColumn = visibleColumns[index + 1]
                return (
                  <TableHead
                    key={c.key}
                    data-column-key={c.key}
                    data-column-label={c.label}
                    className={cn('relative', c.headClassName)}
                    style={{ width: columnWidths[c.key] ?? c.defaultWidth }}
                    aria-sort={sortKey === c.sortKey ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <button
                      type="button"
                      className="flex h-full w-full items-center gap-1 text-left font-medium hover:text-foreground"
                      disabled={showLoading}
                      onClick={() => onSort(c)}
                    >
                      <span className="truncate">{c.label}</span>
                      {sortKey === c.sortKey
                        ? direction === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                        : <ArrowUpDown className="size-3.5 text-muted-foreground/50" />}
                    </button>
                    {nextColumn && (
                      <div
                        role="separator"
                        aria-label={`Resize ${c.label} column`}
                        aria-orientation="vertical"
                        aria-valuemin={MIN_COLUMN_WIDTH}
                        aria-valuemax={MAX_COLUMN_WIDTH}
                        aria-valuenow={columnWidths[c.key] ?? c.defaultWidth}
                        tabIndex={0}
                        title="Drag or use arrow keys to resize. Double-click or press Home to reset this boundary."
                        onDoubleClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          resetColumnBoundary(c.key, nextColumn.key)
                        }}
                        className={cn(
                          'absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none outline-none',
                          'before:absolute before:inset-y-2 before:left-1/2 before:w-px before:bg-border/70',
                          'hover:before:w-0.5 hover:before:bg-primary focus-visible:before:w-0.5 focus-visible:before:bg-primary',
                          resizingColumn === c.key && 'before:w-0.5 before:bg-primary',
                        )}
                        onPointerDown={(event) => startColumnResize(event, c.key, nextColumn.key)}
                        onPointerMove={resizeColumn}
                        onPointerUp={finishColumnResize}
                        onPointerCancel={finishColumnResize}
                        onLostPointerCapture={finishColumnResize}
                        onKeyDown={(event) => resizeColumnWithKeyboard(event, c.key, nextColumn.key)}
                      />
                    )}
                  </TableHead>
                )
              })}
              {locate && <TableHead className="w-[48px]" />}
              {canEdit && <TableHead className="w-[64px] bg-muted pr-4 text-right min-[1100px]:sticky min-[1100px]:right-0 min-[1100px]:z-20 min-[1100px]:border-l">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showLoading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="record-row h-[33px] hover:bg-transparent" aria-hidden="true">
                  {expand && <TableCell className="record-toggle w-[40px]" />}
                  {visibleColumns.map((c, idx) => (
                    <TableCell key={c.key} data-label={c.label} data-content={c.mobileContent || undefined} className={c.cellClassName}>
                      <Skeleton
                        className={cn(
                          'h-4',
                          c.skeleton ??
                            SKELETON_BAR_WIDTHS[(i * 7 + idx * 13) % SKELETON_BAR_WIDTHS.length],
                        )}
                      />
                    </TableCell>
                  ))}
                  {locate && <TableCell />}
                  {canEdit && (
                    <TableCell className="record-actions bg-background pr-4 text-right group-hover:bg-muted min-[1100px]:sticky min-[1100px]:right-0 min-[1100px]:z-10 min-[1100px]:border-l">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        aria-label="Delete row"
                        disabled
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}

            {!showLoading &&
              rows.map((row) => {
                const id = rowKey(row)
                const isExpanded = expandedIds.has(id)
                return (
                  <Fragment key={id}>
                    <TableRow
                      ref={(element) => {
                        if (element) rowRefs.current.set(id, element)
                        else rowRefs.current.delete(id)
                      }}
                      className={cn('record-row group h-[33px]', highlightId === id && 'bg-primary/10')}
                    >
                      {expand && (
                        <TableCell className="record-toggle w-[40px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground min-[1100px]:size-7 min-[1100px]:p-0"
                            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpanded(id)}
                          >
                            {isExpanded ? <ChevronDown /> : <ChevronRight />}
                            <span className="min-[1100px]:hidden">Details</span>
                          </Button>
                        </TableCell>
                      )}
                      {visibleColumns.map((c) => (
                        <TableCell key={c.key} data-label={c.label} data-content={c.mobileContent || undefined} className={c.cellClassName}>
                          <OverflowPreviewTrigger
                            handle={overflowPreviewHandle}
                            fallbackText={c.value(row)}
                          >
                            {c.render ? c.render(row) : c.value(row)}
                          </OverflowPreviewTrigger>
                        </TableCell>
                      ))}
                      {locate && (
                        <TableCell className="record-locate text-right" data-active={searching || undefined}>
                          {searching && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Jump to this row"
                              title="Jump to this row in the full list"
                              disabled={jumpingId === id}
                              onClick={() => jumpTo(row)}
                            >
                              <ArrowRightToLine />
                            </Button>
                          )}
                        </TableCell>
                      )}
                      {canEdit && (
                        <TableCell className="record-actions bg-background pr-4 text-right group-hover:bg-muted min-[1100px]:sticky min-[1100px]:right-0 min-[1100px]:z-10 min-[1100px]:border-l">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete row"
                            disabled={busy}
                            onClick={() => remove(row)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {expand && isExpanded && (
                      <TableRow className="record-detail hover:bg-transparent">
                        <TableCell colSpan={columnCount} className="bg-muted/20 p-0">
                          <div className="min-w-0 px-2 py-2 wrap-anywhere sm:px-4 sm:py-3">{expand(row)}</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}

            {!showLoading && rows.length === 0 && (
              <TableRow className="record-empty">
                <TableCell
                  colSpan={columnCount}
                  className="h-20 text-center text-muted-foreground"
                >
                  {searching ? 'No rows match your search.' : emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataPagination
        {...paginationProps}
        position="bottom"
        onPageChange={(next) => void onPageChange(next, true)}
        onSizeChange={(next) => void onSizeChange(next, true)}
      />

      <PreviewCard.Root handle={overflowPreviewHandle}>
        {({ payload }) => {
          if (!payload?.isOverflowing()) return null
          return (
            <PreviewCard.Portal>
              <PreviewCard.Positioner
                side="top"
                sideOffset={6}
                align="start"
                collisionPadding={8}
                className="isolate z-50"
              >
                <PreviewCard.Popup className="max-h-64 w-max min-w-40 max-w-[min(32rem,calc(100vw-1rem))] cursor-text select-text overflow-auto whitespace-pre-wrap break-words rounded-md border bg-popover p-2 text-sm leading-5 text-popover-foreground shadow-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
                  {payload.getText()}
                </PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          )
        }}
      </PreviewCard.Root>
    </div>
  )
}

function OverflowPreviewTrigger({
  handle,
  fallbackText,
  children,
}: {
  handle: PreviewCard.Handle<OverflowPreviewPayload>
  fallbackText: string
  children: React.ReactNode
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const payload: OverflowPreviewPayload = {
    getText: () => triggerRef.current?.innerText.trim() || fallbackText,
    isOverflowing: () => {
      const trigger = triggerRef.current
      if (!trigger) return false
      const cell = trigger.closest<HTMLElement>('[data-slot="table-cell"]')
      if (hasOverflow(trigger) || (cell && hasOverflow(cell))) return true
      return [...trigger.querySelectorAll<HTMLElement>('*')].some((element) => {
        const style = getComputedStyle(element)
        return (style.overflowX !== 'visible' || style.overflowY !== 'visible') && hasOverflow(element)
      })
    },
  }

  return (
    <PreviewCard.Trigger
      handle={handle}
      payload={payload}
      delay={350}
      closeDelay={250}
      render={
        <div
          ref={triggerRef}
          className="overflow-preview block min-w-0 max-w-full truncate outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      }
    >
      {children}
    </PreviewCard.Trigger>
  )
}
