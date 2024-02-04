import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import jsx2jsxPlugin from '@hellomouse/rollup-plugin-jsx2jsx';

export default defineConfig({
  plugins: [
    jsx2jsxPlugin(),
    solid({ ssr: true, extensions: ['.mdx'] })
  ],
})
