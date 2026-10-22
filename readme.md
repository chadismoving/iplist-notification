# Cloudflare IP Range Monitor

A lightweight Cloudflare Worker that checks Cloudflare's published IPv4 and IPv6 ranges, compares them with the previous snapshot in Workers KV, and sends a webhook notification after every check.

## What it does

- Fetches IP ranges from Cloudflare's public `/client/v4/ips` API.
- Stores the latest response in Workers KV (`IP_KV`).
- Reports added and removed IPv4 and IPv6 CIDR ranges when the stored snapshot changes.
- Sends a **no-change** notification when the snapshot is unchanged.
- Attempts to send an error notification if the check fails.
- Runs on the **7th of every month at 00:00 UTC** (08:00 Singapore time).

On the first successful run, the Worker has no previous snapshot, so all published ranges are reported as added.

## Architecture

```text
Cron Trigger (monthly)
       |
       v
Cloudflare Worker --> Cloudflare IP API
       |
       v
Workers KV (previous snapshot)
       |
       v
Compare IPv4 / IPv6 ranges
       |
       v
Webhook (change / no change / error)
```

## Project files

| File | Purpose |
| --- | --- |
| `src/index.js` | Scheduled check, KV comparison, and webhook notifications |
| `wrangler.toml` | Worker settings, Cron Trigger, and KV binding |

## Setup

**Requirements:** Cloudflare account, Node.js, Wrangler CLI, a Workers KV namespace, and a webhook endpoint accepting JSON payloads of the form `{ "text": "..." }`.

1. Create a Workers KV namespace:

   ```bash
   npx wrangler kv namespace create IP_KV
   ```

2. Replace the placeholder `id = "kvid"` under `[[kv_namespaces]]` in `wrangler.toml` with the namespace ID returned by Wrangler. Keep the binding name `IP_KV`.

3. Configure the webhook URL as a Worker secret (recommended):

   ```bash
   npx wrangler secret put WEBHOOK_URL
   ```

   Enter the webhook URL when prompted. Remove the existing `WEBHOOK_URL` entry from `[vars]` in `wrangler.toml` before deploying, so the placeholder does not override the secret. Do not commit real webhook URLs.

4. Deploy:

   ```bash
   npx wrangler deploy
   ```

The Cron Trigger in `wrangler.toml` is:

```toml
[triggers]
crons = ["0 0 7 * *"]
```

The Worker is intended for scheduled execution. Direct HTTP requests return `400` with `Use scheduled event only.`

## Notifications

The Worker posts JSON containing a `text` field to the configured webhook:

- **Changed:** Timestamp plus added/removed IPv4 and IPv6 CIDR ranges.
- **Unchanged:** Confirmation that the monthly check completed without a snapshot change.
- **Error:** A failure message if fetching, parsing, or updating fails and the webhook is reachable.

## Implementation notes

- Snapshot changes are detected by comparing serialized API responses. A response-order change could therefore trigger a change notification even if the CIDR sets are identical.
- The KV snapshot is updated before sending the change webhook. If delivery fails, the change notification is not automatically retried.
- Webhook delivery errors are logged rather than propagated; an error notification is not guaranteed if the webhook itself is unavailable.

This repository retains the original implementation and monthly notification behavior.
