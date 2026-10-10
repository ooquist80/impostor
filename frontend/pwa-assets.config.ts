import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run icons` regenerates the PNG icons in public/ from public/icon.svg. The output is committed.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#14122B' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#14122B' } },
  },
  images: ['public/icon.svg'],
})
