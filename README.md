This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Verification (START HERE)

Canonical verification standard + model role split:
- **`VERIFICATION_RUNBOOK.md`**

Model assignments + guardrails:
- `specs/model-assignments.md`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Corporate actions (splits / reverse splits)

This repo supports split-proof time-series via a D1 `corporate_actions` table.

APIs:
- `GET /api/d1/corporate-actions?ticker=...`
- `GET /api/d1/normalize-shares?ticker=...&value=...&as_of=YYYY-MM-DD&basis=current&kind=shares|price`

LLM extraction script:

```bash
# Requires: OPENAI_API_KEY, Cloudflare D1 env vars, and R2 env vars
LIMIT=10 DRY_RUN=true npx tsx scripts/llm-extract-corporate-actions.ts
```

Normalization convention is documented in `REGRESSION.md`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
