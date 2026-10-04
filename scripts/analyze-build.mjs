import { build } from 'vite'

await build({
  build: { write: false },
  plugins: [
    {
      name: 'report-package-sizes',
      generateBundle(_options, bundle) {
        const sizes = new Map()
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue
          for (const [id, module] of Object.entries(chunk.modules)) {
            const path = id.split('node_modules/').at(-1)
            const name = id.includes('node_modules/')
              ? path.startsWith('@')
                ? path.split('/').slice(0, 2).join('/')
                : path.split('/')[0]
              : 'project'
            sizes.set(name, (sizes.get(name) ?? 0) + module.renderedLength)
          }
        }
        console.table(
          [...sizes]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([name, size]) => ({ package: name, 'rendered KB (before minification)': Math.round(size / 1024) })),
        )
      },
    },
  ],
})
