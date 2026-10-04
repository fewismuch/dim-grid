import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/lib',
    lib: {
      entry: 'src/index.ts',
      name: 'DimGrid',
      formats: ['es', 'cjs'],
      fileName: (format) => `dim-grid.${format === 'es' ? 'js' : 'cjs'}`,
      cssFileName: 'style',
    },
    rollupOptions: {
      external: (id) =>
        /^(react|react-dom|antd|@ant-design\/icons|@dnd-kit\/core|@dnd-kit\/sortable|dayjs)(\/|$)/.test(id),
    },
  },
})
