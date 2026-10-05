# dim-grid

[English](README.en.md) | 简体中文

可嵌入 React 应用的多维表格组件。支持编辑字段和记录、筛选与排序、分组、搜索、列统计、撤销重做，以及 JSON 导入导出。

## 预览

主表格视图，包含文本、状态、进度、评分、标签、日期等字段，底部提供“添加记录”入口。

![主表格视图](docs/demo.webp)

点击列头可打开列菜单，进行编辑列、复制列、插入列、固定、分组、筛选、排序和高亮重复值等操作。

![列菜单](docs/demo1.webp)

“编辑列”对话框提供全部 13 种字段类型。

![编辑列对话框](docs/demo2.webp)

## 功能

- **13 种字段类型**：文本、数字、小数、单选、多选、链接、日期、复选框、邮箱、评分、进度、新建时间和修改时间。
- **列操作**：添加、编辑、复制、插入列，固定列，按本列分组、筛选、排序和高亮重复值。
- **表格视图**：筛选、排序、分组、搜索、固定和隐藏列、调整列宽与行高、重复值高亮、列统计。
- **记录操作**：添加、编辑、复制、拖动排序，以及撤销和重做。
- **数据保存**：可选的浏览器本地存储、JSON 备份导入导出。

## 运行演示

需要 Node.js 22.18+ 和 pnpm。

```sh
pnpm install
pnpm dev
```

打开终端显示的本地地址。演示数据位于 [`src/demoData.ts`](src/demoData.ts)，包含全部 13 种字段和五条可编辑记录。演示页关闭了本地存储，刷新后会恢复到初始演示数据。在线演示：<https://fewismuch.github.io/dim-grid/>。

## 在 React 项目中使用

项目需要提供 React 18 或 19 和 React DOM。当前仓库可先打包成 tarball，再安装到使用方项目：

```sh
pnpm pack
# 在使用方项目中运行：
pnpm add /path/to/dim-grid-1.0.0.tgz
```

引入组件和样式，提供字段、记录以及一个确定的高度：

```tsx
import { DimGrid } from 'dim-grid'
import 'dim-grid/style.css'

const initialData = {
  fields: [
    { id: 'name', label: '姓名', type: 'text' as const },
    { id: 'done', label: '已完成', type: 'checkbox' as const },
  ],
  rows: [
    { id: 'person-1', name: '张三', done: false },
    { id: 'person-2', name: '李四', done: true },
  ],
}

export function RecordsPage() {
  return <DimGrid height={600} storageKey="records-page.document" initialData={initialData} />
}
```

`initialData` 只在首次挂载时用于初始化。每个字段和记录都需要唯一的 `id`；记录中的值使用字段 ID 作键。默认情况下，组件会先读取 `storageKey` 对应的本地数据，因此已有保存内容会覆盖 `initialData`。修改 `initialData` 属性也不会重置正在编辑的表格。

如果不需要浏览器本地存储，设置 `enableLocalStorage={false}`。此时组件从 `initialData` 开始，不读取或写入 `localStorage`，编辑内容只保留在当前组件实例中；JSON 导入导出仍然可用。

### 组件属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `initialData` | `{ fields, rows, view? }` | 内置示例数据 | 首次挂载时的表格内容；`view` 可选。 |
| `locale` | `'zh-CN' \| 'en-US'` | `'zh-CN'` | 组件界面、Ant Design 控件和日期编辑器的语言。 |
| `theme` | Ant Design `ThemeConfig` | — | 传给组件内部 `ConfigProvider` 的主题配置。 |
| `enableLocalStorage` | `boolean` | `true` | 是否读取和保存到浏览器本地存储。 |
| `storageKey` | `string` | `dim-grid.document` | 本地存储键；同一域名下的多个表格应使用不同的键。 |
| `height` | CSS 高度值 | `100%` | 表格高度；使用 `100%` 时，父容器需有确定高度。 |
| `className`、`style` | React 容器属性 | — | 设置外层容器样式。 |

组件会为自身的 Ant Design 控件设置语言和主题，无需在应用入口额外包 `ConfigProvider` 或调用全局 `dayjs.locale()`。例如：

```tsx
<DimGrid
  locale="en-US"
  theme={{ token: { colorPrimary: '#00b96b' } }}
  initialData={initialData}
  height={600}
/>
```

`locale` 只翻译组件界面；传入的字段名、选项和记录内容属于业务数据，不会被自动翻译。

### 字段值约定

字段类型定义在 [`src/model/table.ts`](src/model/table.ts)。数字与小数传数字，复选框传布尔值，日期在内存中使用 `Date`。多选和链接在内存中分别使用 JSON 数组字符串和 JSON 对象字符串；新建与修改时间使用 ISO 时间字符串。评分和进度可参照 [`src/demoData.ts`](src/demoData.ts) 中的示例值。

公共入口还导出 `TableDocument`、`FieldDef`、`RowData` 等类型，以及 `serializeDocument`、`deserializeDocument`。若数据来自导出的 JSON，可先用 `deserializeDocument(json)` 转为组件所需的数据结构。

## 开发与构建

```sh
pnpm check      # 类型检查、Lint、测试和构建
pnpm build      # 独立演示页
pnpm build:lib  # ESM、CommonJS、CSS 和 TypeScript 声明
```

项目基于 Vite、React、Ant Design 和 react-datasheet-grid。

## 许可证

[MIT](LICENSE)
