# Next.js starter files

Copy these into a new App Router app after `bun add @blocklify/preview`.

```bash
cp -R node_modules/@blocklify/preview/starter/nextjs/app ./app
cp node_modules/@blocklify/preview/starter/nextjs/.env.example ./.env.local
```

Then set `BLOCKLIFY_API_URL`, `NEXT_PUBLIC_BLOCKLIFY_API_URL`, and `BLOCKLIFY_ACCESS_TOKEN` in `.env.local`.

Register `http://localhost:3001/preview` under Space → Settings → Live preview URLs, and run this app on port 3001.
