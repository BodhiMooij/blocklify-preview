# React (Vite) starter files

Copy these into a Vite React app after `bun add @blocklify/preview react-router-dom`.

```bash
cp node_modules/@blocklify/preview/starter/react/src/App.tsx ./src/App.tsx
cp node_modules/@blocklify/preview/starter/react/src/main.tsx ./src/main.tsx
mkdir -p src/pages
cp node_modules/@blocklify/preview/starter/react/src/pages/PreviewPage.tsx ./src/pages/PreviewPage.tsx
cp node_modules/@blocklify/preview/starter/react/.env.example ./.env
```

Register `http://localhost:5173/preview` under Space → Settings → Live preview URLs.
