# ACI + OpenAI API + Vercel

This is the live prototype architecture:

Browser -> `/api/chat` -> ACI intelligence -> OpenAI Responses API -> real response -> browser.

## Deploy

1. Create/import this project into Vercel.
2. Add an environment variable:
   - `OPENAI_API_KEY` = your API key
3. Optional:
   - `OPENAI_MODEL` = `gpt-5.6-luna` (or another model your API account has access to)
4. Deploy.

Never put the API key in `public/index.html`, `app.js`, GitHub, or any browser code.

## ACI layer

The API classifies the request into a task type, estimates complexity and sensitivity, then adds that intelligence to the model instructions. The response trace contains model, latency, token usage and task profile.

The current model is intentionally configurable. Later, replace the single OpenAI call with the ACI economic router and multiple providers/models.

## Important pricing note

Do not use hard-coded pricing as a commercial claim. Pull current official API pricing for the exact model/account and calculate actual cost from usage. The trace currently records token usage so the economics layer can calculate real cost later.
