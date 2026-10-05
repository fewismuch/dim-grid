import { Button } from 'antd'
import React, { type Dispatch, type RefObject, type SetStateAction } from 'react'
import s from '../App.module.css'
import { calcStat, type FieldDef, type RowData } from '../constants'
import StatsMenu from './StatsMenu'

type Props = {
  orderedFields: FieldDef[]
  columnWidths: Record<string, number>
  pinnedFieldId?: string
  columnPreview: Record<string, number>
  processedRows: RowData[]
  colStats: Record<string, string>
  setColStats: Dispatch<SetStateAction<Record<string, string>>>
  statsMenu: string | null
  setStatsMenu: Dispatch<SetStateAction<string | null>>
  footerScrollRef: RefObject<HTMLDivElement>
  footerWidth: number | undefined
  syncHorizontalScroll: (left: number) => void
}

export default function GridFooter({
  orderedFields,
  columnWidths,
  pinnedFieldId,
  columnPreview,
  processedRows,
  colStats,
  setColStats,
  statsMenu,
  setStatsMenu,
  footerScrollRef,
  footerWidth,
  syncHorizontalScroll,
}: Props) {
  const pinnedField = orderedFields.find((field) => field.id === pinnedFieldId)
  return (
    <div className={s.footer}>
      <div
        className={s.footerScroll}
        ref={footerScrollRef}
        onScroll={(event) => syncHorizontalScroll(event.currentTarget.scrollLeft)}
      >
        <div
          className={s.footerColumns}
          style={{
            width: footerWidth,
            minWidth:
              88 +
              orderedFields.reduce((width, field) => width + (columnPreview[field.id] ?? columnWidths[field.id]), 0),
          }}
        >
          <div className={s.footerGutter} aria-hidden="true" />
          {orderedFields.map((field) => {
            const isFirst = field.id === orderedFields[0]?.id
            const stat = colStats[field.id] || (isFirst ? '记录总数' : '不展示')
            const val = calcStat(stat, processedRows, field)
            return (
              <React.Fragment key={field.id}>
                <Button
                  type="text"
                  className={`${s.footerCol} ${val === null ? s.footerColEmpty : ''} ${pinnedField?.id === field.id ? s.footerPinned : ''}`}
                  style={{
                    flex: `0 0 ${columnPreview[field.id] ?? columnWidths[field.id]}px`,
                    minWidth: 60,
                    fontSize: 12,
                  }}
                  aria-label={`${field.label}统计`}
                  onClick={() => setStatsMenu(statsMenu === field.id ? null : field.id)}
                >
                  <span className={s.footerContent}>
                    {val !== null ? (
                      <>
                        <span className={s.footerColLabel}>{stat}</span>
                        <span className={s.footerColVal}>{val}</span>
                      </>
                    ) : (
                      <span className={s.footerAddStat}>+ 统计</span>
                    )}
                  </span>
                  {statsMenu === field.id && (
                    <StatsMenu
                      current={stat}
                      onSelect={(stat) => {
                        setColStats((c) => ({ ...c, [field.id]: stat }))
                        setStatsMenu(null)
                      }}
                      onClose={() => setStatsMenu(null)}
                    />
                  )}
                </Button>
              </React.Fragment>
            )
          })}
          <div className={s.footerAdd} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
