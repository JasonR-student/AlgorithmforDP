/** @type {import('vite').UserConfig} */
export default {
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    emptyOutDir: false,
  },
};
