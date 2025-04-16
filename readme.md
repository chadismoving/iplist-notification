# Cloudflare IP Checker (Cloudflare Worker)

This Cloudflare Worker fetches the latest Cloudflare IP list from the public API, compares it with the previous version stored in KV, and sends a webhook notification (e.g., to Slack) only when the list has changed. It runs automatically on a scheduled basis.

## Features

- Scheduled fetch from Cloudflare API (`/client/v4/ips`)
- Stores current IP list in Workers KV
- Compares with previous version
- Sends a webhook if:
  - IP list has changed (with diff)
  - Or no change (simple check-in)

## Setup

### 1. Create a KV Namespace

wrangler kv:namespace create \"IP_KV\"

In your `wrangler.toml`:
[[kv_namespaces]]
binding = \"IP_KV\"
id = \"<your_namespace_id>\"

---

### 2. Set Environment Variables

In your `wrangler.toml`:
[vars]
WEBHOOK_URL = \"https://hooks.slack.com/services/...\" 

---

### 3. Enable Scheduled Triggers

[[triggers]]
crons = [ "0 0 7 * *" ]  # every week; change as needed


### 4. Deploy

wrangler deploy

## Webhook Format

- If IP changed:
Cloudflare IP list changed at 2025-04-14T09:00:00Z
Added IPv4: ...
Removed IPv6: ...

- If no change:
 No change detected. IP list checked at 2025-04-14T09:00:00Z

- If failed:
Failed to update Cloudflare IP list: <error>


## Files

- `index.js`: The Worker logic
- `wrangler.toml`: Config for environment, schedule, and KV

## Reference

- [Cloudflare IPs API](https://developers.cloudflare.com/api/resources/ips/methods/list/)
- [KV Docs](https://developers.cloudflare.com/kv/)
- [Workers Cron Triggers](https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/)
