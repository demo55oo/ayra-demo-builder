# Ayra demo agent generator

White Tailwind landing page. Paste a website URL, n8n scrapes it, OpenAI writes a Maria-style inbound prompt, Vapi creates a no-tools demo assistant and a free number you can tap to call.

This repo is only the frontend. The webhook lives on n8n:

- `https://automation.ayra.cx/webhook/demo-agent-builder`

## Local

Open `index.html` from a static server (not `file://`).

```bash
npx serve .
```

## Railway

The `start` script serves the folder on `$PORT`. Connect this GitHub repo as a Railway static/Node service and generate a public domain.
