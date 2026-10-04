import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// react-datasheet-grid exposes only a right-pinned column. Keep a left-pinned
// first column mounted and make its hit testing, scrolling, and selection agree.
// Apply on installation too, so a clean checkout has the same behavior.
const require = createRequire(import.meta.url)
const root = dirname(require.resolve('react-datasheet-grid/package.json'))
const marker = '// dim-grid: left-pinned column support'
const patch = (file, replacements) => {
  const path = join(root, 'dist/components', file)
  let source = readFileSync(path, 'utf8')
  if (source.includes(marker)) return
  for (const [before, after] of replacements) {
    if (!source.includes(before)) throw new Error(`Grid patch no longer matches ${file}: ${before.slice(0, 80)}`)
    source = source.replace(before, after)
  }
  writeFileSync(path, `${marker}\n${source}`)
}

patch('Grid.js', [
  [
    'if (result[0] !== 0) {',
    `if (columns[1]?.headerClassName === 'dsg-cell-pinned-left' && !result.includes(1)) {
                result.unshift(1);
            }
            if (result[0] !== 0) {`,
  ],
])

patch('DataSheetGrid.js', [
  [
    'const hasStickyRightColumn = Boolean(stickyRightColumn);',
    `const hasStickyRightColumn = Boolean(stickyRightColumn);
    const hasPinnedLeftColumn = columns[1]?.headerClassName === 'dsg-cell-pinned-left';
    const [horizontalOffset, setHorizontalOffset] = (0, react_1.useState)(0);`,
  ],
  [
    'const outerBoundingClientRect = includeSticky && getOuterBoundingClientRect(force);',
    'const outerBoundingClientRect = (includeSticky || hasPinnedLeftColumn) && getOuterBoundingClientRect(force);',
  ],
  [
    'if (hasStickyRightColumn &&\n                    outerBoundingClientRect.right',
    `if (hasPinnedLeftColumn && event.clientX - outerBoundingClientRect.left > columnWidths[0] &&
                    event.clientX - outerBoundingClientRect.left < columnWidths[0] + columnWidths[1]) {
                    x = columnRights[0] + 1;
                }
                if (hasStickyRightColumn &&
                    outerBoundingClientRect.right`,
  ],
  [
    '        columnRights,\n        columnWidths,\n        data.length,',
    '        columnRights,\n        columnWidths,\n        hasPinnedLeftColumn,\n        data.length,',
  ],
  ['!cell.doNotScrollX) {', '!cell.doNotScrollX && !(hasPinnedLeftColumn && cell.col === 0)) {'],
  [
    'const leftMax = columnRights[cell.col] - columnRights[0];',
    'const leftMax = columnRights[cell.col] - columnRights[0] - (hasPinnedLeftColumn ? columnWidths[1] : 0);',
  ],
  [
    '        height,\n        width,\n        headerRowHeight,',
    '        height,\n        width,\n        hasPinnedLeftColumn,\n        headerRowHeight,',
  ],
  [
    'cellClassName: cellClassName, onScroll: onScroll },',
    `cellClassName: cellClassName, onScroll: (event) => {
                setHorizontalOffset(event.currentTarget.scrollLeft);
                onScroll?.(event);
            } },`,
  ],
  [
    'createElement(SelectionRect_1.SelectionRect, { columnRights:',
    'createElement(SelectionRect_1.SelectionRect, { hasPinnedLeftColumn, horizontalOffset, columnRights:',
  ],
])

patch('SelectionRect.js', [
  ['memo(({ columnWidths,', 'memo(({ hasPinnedLeftColumn, horizontalOffset = 0, columnWidths,'],
  [
    '    const minSelection =',
    `    if (hasPinnedLeftColumn) {
        if (activeCell?.col === 0 && activeCellRect) activeCellRect.left += horizontalOffset;
        if (selection?.min.col === 0 && selectionRect) {
            selectionRect.left += horizontalOffset;
            if (selection.max.col > 0) selectionRect.width = Math.max(columnWidths[1], selectionRect.width - horizontalOffset);
        }
    }
    const minSelection =`,
  ],
  [
    "'dsg-active-cell-focus': editing,",
    "'dsg-active-cell-focus': editing,\n                'dsg-active-cell-pinned-left': hasPinnedLeftColumn && activeCell.col === 0,",
  ],
])
