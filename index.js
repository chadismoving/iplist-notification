export default {
	async scheduled(event, env, ctx) {
	  await handleUpdate(env);
	},
  
	async fetch(request, env, ctx) {
	  return new Response("Use scheduled event only.", { status: 400 });
	},
  };
  
  async function handleUpdate(env) {
	const CLOUDFLARE_API_URL = "https://api.cloudflare.com/client/v4/ips";
	const WEBHOOK_URL = env.WEBHOOK_URL;
  
	try {
	  const res = await fetch(CLOUDFLARE_API_URL, {
		method: "GET",
		headers: {
		  "Content-Type": "application/json",
		},
	  });
  
	  if (!res.ok) throw new Error("Failed to fetch Cloudflare IP list.");
  
	  const data = await res.json();
	  const newIpData = data.result;
	  const newIpList = JSON.stringify(newIpData);
  
	  const existingIpList = await env.IP_KV.get("cloudflare_ips");
  
	  if (existingIpList !== newIpList) {
		await env.IP_KV.put("cloudflare_ips", newIpList);
  
		const oldData = existingIpList ? JSON.parse(existingIpList) : { ipv4_cidrs: [], ipv6_cidrs: [] };
		const addedIPv4 = newIpData.ipv4_cidrs.filter(ip => !oldData.ipv4_cidrs.includes(ip));
		const removedIPv4 = oldData.ipv4_cidrs.filter(ip => !newIpData.ipv4_cidrs.includes(ip));
		const addedIPv6 = newIpData.ipv6_cidrs.filter(ip => !oldData.ipv6_cidrs.includes(ip));
		const removedIPv6 = oldData.ipv6_cidrs.filter(ip => !newIpData.ipv6_cidrs.includes(ip));
  
		const diffMessage = [
		  `⚡ Cloudflare IP list changed at ${new Date().toISOString()}`,
		  addedIPv4.length ? `➕ Added IPv4: ${addedIPv4.join(", ")}` : "",
		  removedIPv4.length ? `➖ Removed IPv4: ${removedIPv4.join(", ")}` : "",
		  addedIPv6.length ? `➕ Added IPv6: ${addedIPv6.join(", ")}` : "",
		  removedIPv6.length ? `➖ Removed IPv6: ${removedIPv6.join(", ")}` : "",
		].filter(Boolean).join("\n");
  
		await sendWebhook(WEBHOOK_URL, { text: diffMessage });
	  } else {
		await sendWebhook(WEBHOOK_URL, {
		  text: `✅ No change detected. IP list checked at ${new Date().toISOString()}`,
		});
	  }
	} catch (err) {
	  console.error("Update failed:", err);
  
	  await sendWebhook(env.WEBHOOK_URL, {
		text: `❌ Failed to update Cloudflare IP list: ${err.message}`,
	  });
	}
  }
  
  async function sendWebhook(url, payload) {
	try {
	  const resp = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	  });
	  if (!resp.ok) {
		console.error(`Webhook failed: ${resp.status} ${resp.statusText}`);
	  }
	} catch (e) {
	  console.error("Webhook sending error:", e);
	}
  }
  