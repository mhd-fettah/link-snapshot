# LinkSnap

Paste URLs → capture full-page PNG screenshots (optional HTML) → Explorer opens the output folder.

**Requires Chrome or Edge** on Windows. See **[docs/PRODUCT.md](docs/PRODUCT.md)** for full product and technical documentation.

## Quick start

```bash
npm install
npx playwright install chromium   # fallback browser only
npm start
```

## Build

```bash
npm run build
```

Outputs to `dist/`: NSIS installer + portable exe.

## License

MIT
