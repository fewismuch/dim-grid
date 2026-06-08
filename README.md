# Airtable Grid — react-datasheet-grid Demo

基于 `react-datasheet-grid` 实现的 Airtable 风格表格，支持动态字段管理。

## 功能

- ✅ **字段增删** — 工具栏或表头 `+` 按钮新建字段，编辑面板可删除
- ✅ **字段改名** — 点击列头齿轮图标，修改字段名称
- ✅ **切换字段类型** — 文本 / 数字 / 小数 / 日期 / 复选框 / 下拉 / 邮箱 / 链接 / 电话
- ✅ **下拉选项管理** — 选择 "下拉" 类型后，可动态增删选项
- ✅ **数据直接编辑** — 所有单元格键盘导航，Excel 风格操作
- ✅ **添加行** — 工具栏或表格底部添加

## 快速启动

```bash
npm install
npm run dev
```

然后访问 http://localhost:5173

## 核心依赖

| 包 | 用途 |
|---|---|
| `react-datasheet-grid` | 表格核心，提供各字段类型列 |
| `lucide-react` | 图标 |

## 文件结构

```
src/
  App.jsx      # 主组件：字段状态管理 + DSG 列构建 + Modal
  App.css      # 样式
  index.css    # 全局 + DSG 样式覆盖
  main.jsx     # 入口
```

## 扩展建议

- **字段排序**：给 `fields` 数组加拖拽排序（`@dnd-kit/sortable`）
- **持久化**：将 `fields` 和 `rows` 存入 `localStorage` 或后端 API
- **更多类型**：用 `keyColumn` + 自定义 `component` 实现评分、进度条等
- **视图切换**：在同一 `fields/rows` 状态上叠加看板视图（Kanban）
