import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// react-datasheet-grid exposes only a right-pinned column. Keep every leading
// left-pinned column mounted and make hit testing, scrolling, and selection agree.
// Apply on installation too, so a clean checkout has the same behavior.
const require = createRequire(import.meta.url)
const root = dirname(require.resolve('react-datasheet-grid/package.json'))
const marker = '// dim-grid: multi left-pinned columns'
const legacy = '// dim-grid: left-pinned column support'
const patch = (file, replacements) => {
  const path = join(root, 'dist/components', file)
  let source = readFileSync(path, 'utf8')
  if (source.includes(marker)) return
  if (source.includes(legacy)) {
    throw new Error(`Reinstall react-datasheet-grid before patching ${file}; it still has the single-column pin patch.`)
  }
  for (const [before, after] of replacements) {
    if (!source.includes(before)) throw new Error(`Grid patch no longer matches ${file}: ${before.slice(0, 80)}`)
    source = source.replace(before, after)
  }
  writeFileSync(path, `${marker}\n${source}`)
}

patch('Grid.js', [
  [
    `rangeExtractor: (range) => {
            const result = (0, react_virtual_1.defaultRangeExtractor)(range);
            if (result[0] !== 0) {`,
    `rangeExtractor: (range) => {
            const result = (0, react_virtual_1.defaultRangeExtractor)(range);
            let pinnedLeftCount = 0;
            for (let i = 1; i < columns.length; i++) {
                if (columns[i]?.headerClassName === 'dsg-cell-pinned-left')
                    pinnedLeftCount++;
                else
                    break;
            }
            for (let i = pinnedLeftCount; i >= 1; i--) {
                if (!result.includes(i))
                    result.unshift(i);
            }
            if (result[0] !== 0) {`,
  ],
])

patch('DataSheetGrid.js', [
  [
    'const hasStickyRightColumn = Boolean(stickyRightColumn);',
    `const hasStickyRightColumn = Boolean(stickyRightColumn);
    const pinnedLeftCount = (0, react_1.useMemo)(() => {
        let count = 0;
        for (let i = 1; i < columns.length; i++) {
            if (columns[i]?.headerClassName === 'dsg-cell-pinned-left')
                count++;
            else
                break;
        }
        return count;
    }, [columns]);
    const hasPinnedLeftColumn = pinnedLeftCount > 0;`,
  ],
  [
    'const { fullWidth, totalWidth: contentWidth, columnWidths, columnRights, } = (0, useColumnWidths_1.useColumnWidths)(columns, width);',
    `const { fullWidth, totalWidth: contentWidth, columnWidths, columnRights, } = (0, useColumnWidths_1.useColumnWidths)(columns, width);
    const pinnedLeftWidth = (0, react_1.useMemo)(() => {
        if (!hasPinnedLeftColumn || !columnWidths)
            return 0;
        return columnWidths.slice(1, 1 + pinnedLeftCount).reduce((a, b) => a + b, 0);
    }, [columnWidths, hasPinnedLeftColumn, pinnedLeftCount]);
    (0, react_1.useLayoutEffect)(() => {
        const element = outerRef.current;
        if (element)
            element.style.setProperty('--dsg-h-scroll', \`\${element.scrollLeft}px\`);
    }, [hasPinnedLeftColumn, pinnedLeftCount]);`,
  ],
  [
    'const outerBoundingClientRect = includeSticky && getOuterBoundingClientRect(force);',
    'const outerBoundingClientRect = (includeSticky || hasPinnedLeftColumn) && getOuterBoundingClientRect(force);',
  ],
  [
    `if (event.clientX - outerBoundingClientRect.left <=
                    columnWidths[0]) {
                    x = 0;
                }`,
    `if (event.clientX - outerBoundingClientRect.left <=
                    columnWidths[0]) {
                    x = 0;
                }
                if (hasPinnedLeftColumn && event.clientX - outerBoundingClientRect.left > columnWidths[0] &&
                    event.clientX - outerBoundingClientRect.left < columnWidths[0] + pinnedLeftWidth) {
                    const offsetX = event.clientX - outerBoundingClientRect.left - columnWidths[0];
                    let acc = 0;
                    for (let i = 0; i < pinnedLeftCount; i++) {
                        const w = columnWidths[i + 1];
                        if (offsetX < acc + w) {
                            x = columnRights[i] + offsetX - acc + 1;
                            break;
                        }
                        acc += w;
                    }
                }`,
  ],
  [
    `    }, [
        columnRights,
        columnWidths,
        data.length,`,
    `    }, [
        columnRights,
        columnWidths,
        hasPinnedLeftColumn,
        pinnedLeftCount,
        pinnedLeftWidth,
        data.length,`,
  ],
  ['!cell.doNotScrollX) {', '!cell.doNotScrollX && !(hasPinnedLeftColumn && cell.col < pinnedLeftCount)) {'],
  [
    'const leftMax = columnRights[cell.col] - columnRights[0];',
    'const leftMax = columnRights[cell.col] - columnRights[0] - (hasPinnedLeftColumn ? pinnedLeftWidth : 0);',
  ],
  [
    `    }, [
        height,
        width,
        headerRowHeight,`,
    `    }, [
        height,
        width,
        hasPinnedLeftColumn,
        pinnedLeftCount,
        pinnedLeftWidth,
        headerRowHeight,`,
  ],
  [
    'cellClassName: cellClassName, onScroll: onScroll },',
    `cellClassName: cellClassName, onScroll: (event) => {
                event.currentTarget.style.setProperty('--dsg-h-scroll', \`\${event.currentTarget.scrollLeft}px\`);
                onScroll?.(event);
            } },`,
  ],
  [
    'createElement(SelectionRect_1.SelectionRect, { columnRights:',
    'createElement(SelectionRect_1.SelectionRect, { hasPinnedLeftColumn, pinnedLeftCount, pinnedLeftWidth, columnRights:',
  ],
])

patch('SelectionRect.js', [
  [
    'memo(({ columnWidths,',
    'memo(({ hasPinnedLeftColumn, pinnedLeftCount = 0, pinnedLeftWidth = 0, columnWidths,',
  ],
  [
    '    const minSelection =',
    `    const stickPinned = hasPinnedLeftColumn && (selection ? selection.min.col : activeCell?.col) < pinnedLeftCount;
    const stickSpan = Boolean(stickPinned && selection && selection.max.col >= pinnedLeftCount);
    const minSelection =`,
  ],
  [
    '{ className: "dsg-selection-col-marker-container", style: {',
    '{ className: (0, classnames_1.default)(\'dsg-selection-col-marker-container\', stickPinned && \'dsg-selection-pinned\', stickSpan && \'dsg-selection-pinned-span\'), style: {',
  ],
  [
    "className: (0, classnames_1.default)('dsg-selection-rect', selectionIsDisabled && 'dsg-selection-rect-disabled'), style: Object.assign(Object.assign({}, selectionRect), { clipPath:",
    "className: (0, classnames_1.default)('dsg-selection-rect', selectionIsDisabled && 'dsg-selection-rect-disabled', stickPinned && 'dsg-selection-pinned', stickSpan && 'dsg-selection-pinned-span'), style: Object.assign(Object.assign({}, selectionRect), { '--sel-width': `${selectionRect.width}px`, '--pin-width': `${pinnedLeftWidth}px`, clipPath:",
  ],
  [
    "'dsg-active-cell-focus': editing,",
    "'dsg-active-cell-focus': editing,\n                'dsg-active-cell-pinned-left': hasPinnedLeftColumn && activeCell.col < pinnedLeftCount,",
  ],
])
