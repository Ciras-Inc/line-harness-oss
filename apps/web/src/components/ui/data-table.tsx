'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Column<T> = {
  key: keyof T | string
  header: string
  sortable?: boolean
  cell?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends { id?: string | number }> {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  pageSize?: number
  selectable?: boolean
  onSelectionChange?: (selected: T[]) => void
  bulkActions?: React.ReactNode
  emptyState?: React.ReactNode
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = '検索...',
  searchKeys = [],
  pageSize = 20,
  selectable = false,
  onSelectionChange,
  bulkActions,
  emptyState,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string | number>>(new Set())

  // 検索フィルタ
  const filtered = useMemo(() => {
    if (!search || searchKeys.length === 0) return data
    const lower = search.toLowerCase()
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key]
        return val != null && String(val).toLowerCase().includes(lower)
      })
    )
  }, [data, search, searchKeys])

  // ソート
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), 'ja')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // ページネーション
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  const allIds = paged.map((r) => r.id ?? '')
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = allIds.some((id) => selected.has(id))

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected)
      allIds.forEach((id) => next.delete(id))
      setSelected(next)
      onSelectionChange?.(data.filter((r) => next.has(r.id ?? '')))
    } else {
      const next = new Set(selected)
      allIds.forEach((id) => next.add(id))
      setSelected(next)
      onSelectionChange?.(data.filter((r) => next.has(r.id ?? '')))
    }
  }

  const toggleRow = (id: string | number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    onSelectionChange?.(data.filter((r) => next.has(r.id ?? '')))
  }

  const getCellValue = (row: T, key: string): React.ReactNode => {
    const val = (row as Record<string, unknown>)[key]
    return val != null ? String(val) : '—'
  }

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={13} className="ml-1 text-muted-foreground" />
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="ml-1 text-primary" />
      : <ChevronDown size={13} className="ml-1 text-primary" />
  }

  return (
    <div className="space-y-3">
      {/* 検索 & バルクアクション */}
      {(searchable || (selectable && bulkActions && selected.size > 0)) && (
        <div className="flex items-center justify-between gap-3">
          {searchable && (
            <div className="relative max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          )}
          {selectable && selected.size > 0 && bulkActions && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selected.size}件選択</span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      {/* テーブル */}
      <div className="rounded-md border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    aria-label="全選択"
                    className="cursor-pointer accent-primary"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={cn(col.className, col.sortable && 'cursor-pointer select-none')}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable && <SortIcon colKey={String(col.key)} />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-12">
                  {emptyState ?? <span className="text-muted-foreground text-sm">データがありません</span>}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, ri) => {
                const id = row.id ?? ri
                return (
                  <TableRow key={id} data-state={selected.has(id) ? 'selected' : undefined}>
                    {selectable && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleRow(id)}
                          aria-label="行選択"
                          className="cursor-pointer accent-primary"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={String(col.key)} className={col.className}>
                        {col.cell ? col.cell(row) : getCellValue(row, String(col.key))}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{sorted.length}件中 {(page - 1) * pageSize + 1}〜{Math.min(page * pageSize, sorted.length)}件</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="px-2">{page} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
