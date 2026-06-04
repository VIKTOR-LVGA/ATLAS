# Atlas

Atlas is a Swiss insurance intelligence SaaS built with Next.js App Router,
TypeScript, Tailwind, Supabase Auth/Storage, and AI-assisted policy extraction.

## Environment

Create a root `.env.local` file with these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

OPENAI_API_KEY=your-openai-api-key
OPENAI_POLICY_EXTRACTION_MODEL=gpt-5.2
OPENAI_POLICY_EXTRACTION_MODEL_FAST=gpt-4.1-mini
OPENAI_POLICY_EXTRACTION_MODEL_STRONG=gpt-5.2
OPENAI_POLICY_EXTRACTION_FALLBACK_MODE=hard_failure_only
OPENAI_POLICY_EXTRACTION_MAX_INPUT_CHARS=32000
OPENAI_POLICY_EXTRACTION_CONFIDENCE_FALLBACK=42
```

`OPENAI_POLICY_EXTRACTION_MODEL` remains supported as the strong-model fallback.
First-pass extraction uses `OPENAI_POLICY_EXTRACTION_MODEL_FAST`.
`OPENAI_POLICY_EXTRACTION_FALLBACK_MODE` defaults to `hard_failure_only` (retry strong only on API/parse/refusal failures).
Set `quality_gate` to also retry on sparse/low-confidence fast results.
`OPENAI_POLICY_EXTRACTION_CONFIDENCE_FALLBACK` applies only in `quality_gate` mode.

`OPENAI_API_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_`.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI extraction

Document analysis uses OpenAI structured outputs on the server. Private PDFs
are downloaded from Supabase Storage, readable text is extracted when possible,
and successful runs save an `ai_draft` policy that requires review.

In **production**, a PDF without enough readable text for non-OCR extraction
**fails cleanly** with a user-facing error — Atlas does **not** create mock or
fallback policy drafts.

For **local development only**, optional mock extraction is available when both
are set: `NODE_ENV=development` and `ENABLE_DEV_MOCK_EXTRACTION=true`.

## Useful commands

```bash
npm run lint
npm run build
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
