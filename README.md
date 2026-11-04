# @blocklify/preview

Frontend SDK for [Blocklify](https://www.blocklify.app): Content API client, live preview, and starter blocks for a new website.

## Release

1. Bump `version` in `package.json` on `main`.
2. Tag the release: `git tag v0.2.3 && git push origin main --tags`.
3. GitHub Actions `publish.yml` publishes to npm (configure an [npm Trusted Publisher](https://docs.npmjs.com/trusted-publishers/) for this repo + workflow file `publish.yml`).
4. `sync-blocklify.yml` opens a PR on [blocklify](https://github.com/BodhiMooij/blocklify) to bump the `packages/preview` submodule (secret: `BLOCKLIFY_SYNC_TOKEN`).

## Install

```bash
bun add @blocklify/preview
# or: npm install @blocklify/preview
```

Peer dependencies: `react` and `react-dom` (≥18).

## New Next.js site

```bash
bunx create-next-app@latest my-blocklify-site
cd my-blocklify-site
bun add @blocklify/preview
cp -R node_modules/@blocklify/preview/starter/nextjs/app ./app
cp node_modules/@blocklify/preview/starter/nextjs/.env.example ./.env.local
```

Fill in `.env.local`:

```bash
BLOCKLIFY_API_URL=https://localhost:3000
NEXT_PUBLIC_BLOCKLIFY_API_URL=https://localhost:3000
BLOCKLIFY_ACCESS_TOKEN=blocklify_…
```

Run the site on port 3001 and register `http://localhost:3001/preview` under Space → Settings → Live preview URLs.

`app/page.tsx` renders the published `home` entry. `app/preview/page.tsx` is the editor iframe.

## New React (Vite) site

```bash
bunx create-vite@latest my-blocklify-site --template react-ts
cd my-blocklify-site
bun add @blocklify/preview react-router-dom
cp node_modules/@blocklify/preview/starter/react/src/App.tsx ./src/App.tsx
cp node_modules/@blocklify/preview/starter/react/src/main.tsx ./src/main.tsx
mkdir -p src/pages
cp node_modules/@blocklify/preview/starter/react/src/pages/PreviewPage.tsx ./src/pages/PreviewPage.tsx
cp node_modules/@blocklify/preview/starter/react/.env.example ./.env
```

Register `http://localhost:5173/preview` as the live preview URL.

## What the starter renders

Matches a Blocklify starter space:

| Block type | Fields                                                     |
| ---------- | ---------------------------------------------------------- |
| `hero`     | `headline`, `subheadline`, `image`, `cta_text`, `cta_link` |
| `text`     | `content` (HTML)                                           |
| `image`    | `image`, `caption`, `alt`                                  |
| `cta`      | `headline`, `subtext`, `button_text`, `button_link`        |

`hero_block`, `text_block`, and `image_block` use the same components.

Asset fields can be an id, a URL, or `{ url }`. Pass the Blocklify origin so ids load from `/api/assets/{id}/file`:

```ts
import { BlocklifyEntryView, BlocklifyPreview, createStarterBlockMap } from "@blocklify/preview";

const blockMap = createStarterBlockMap({
    assetBaseUrl: process.env.BLOCKLIFY_API_URL,
});
```

Use `blockMap` with `BlocklifyPreview` on `/preview`, and `BlocklifyEntryView` for the public page.

## Live preview

`BlocklifyPreview` listens for draft content from the Blocklify editor. In that iframe, each block gets a dashed outline. Clicking a block focuses it in the editor. A drag handle reorders body blocks and nested `columns` / `items` cells, and the editor saves that order.

Spread `BlocklifyEditable` on the root element of each block component. For a columns or page block, call `renderNestedBlocks` when it is passed so the cells can be reordered:

```tsx
export function Columns({ block, BlocklifyEditable = {}, blockPath = [], renderNestedBlocks }: BlocklifyBlockProps) {
  const items = Array.isArray(block.columns) ? block.columns : [];
  return (
    <section {...BlocklifyEditable}>
      {renderNestedBlocks ? renderNestedBlocks(items, blockPath, "columns") : null}
    </section>
  );
}
```
