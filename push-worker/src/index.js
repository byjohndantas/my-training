import webpush from "web-push";
import { DurableObject } from "cloudflare:workers";

const ALLOWED_ORIGIN = "https://byjohndantas.github.io";
const json = (data, status = 200, origin = ALLOWED_ORIGIN) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  }
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) return new Response("Forbidden origin", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": ALLOWED_ORIGIN,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      "vary": "Origin"
    }});
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") return json({ ok: true, service: "my-training-notifications", configured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) });
    if (url.pathname === "/vapid-public-key" && request.method === "GET") {
      if (!env.VAPID_PUBLIC_KEY) return json({ error: "VAPID key not configured" }, 503);
      return json({ publicKey: env.VAPID_PUBLIC_KEY });
    }
    if (!["/subscribe", "/unsubscribe", "/schedule", "/cancel"].includes(url.pathname) || request.method !== "POST") return json({ error: "Not found" }, 404);
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ error: "Push service not configured" }, 503);
    let body;
    try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    const id = env.PUSH_HUB.idFromName("john-dantas-my-training");
    return env.PUSH_HUB.get(id).fetch(new Request("https://push-hub" + url.pathname, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }));
  }
};

export class PushHub extends DurableObject {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const body = await request.json().catch(() => ({}));
    if (path === "/subscribe") {
      const { subscription, deviceId } = body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth || !validId(deviceId)) return json({ error: "Invalid subscription" }, 400);
      const subscriptions = await this.ctx.storage.get("subscriptions") || [];
      const next = subscriptions.filter(x => x.subscription.endpoint !== subscription.endpoint);
      next.push({ subscription, deviceId });
      await this.ctx.storage.put("subscriptions", next);
      return json({ ok: true });
    }
    if (path === "/unsubscribe") {
      const { endpoint } = body;
      const subscriptions = await this.ctx.storage.get("subscriptions") || [];
      await this.ctx.storage.put("subscriptions", subscriptions.filter(x => x.subscription.endpoint !== endpoint));
      return json({ ok: true });
    }
    if (path === "/schedule") {
      const { timerId, deviceId, delaySeconds } = body;
      if (!validId(timerId) || !validId(deviceId) || !Number.isInteger(delaySeconds) || delaySeconds < 1 || delaySeconds > 3600) return json({ error: "Invalid timer" }, 400);
      const timers = await this.ctx.storage.get("timers") || [];
      const next = timers.filter(x => x.timerId !== timerId);
      next.push({ timerId, deviceId, runAt: Date.now() + delaySeconds * 1000 });
      await this.ctx.storage.put("timers", next);
      await this.setNextAlarm(next);
      return json({ ok: true, scheduledFor: Date.now() + delaySeconds * 1000 });
    }
    if (path === "/cancel") {
      const { timerId, deviceId } = body;
      const timers = await this.ctx.storage.get("timers") || [];
      const next = timers.filter(x => !(x.timerId === timerId && x.deviceId === deviceId));
      await this.ctx.storage.put("timers", next);
      await this.setNextAlarm(next);
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  }

  async setNextAlarm(timers) {
    if (!timers.length) { await this.ctx.storage.deleteAlarm(); return; }
    await this.ctx.storage.setAlarm(Math.min(...timers.map(x => x.runAt)));
  }

  async alarm() {
    const timers = await this.ctx.storage.get("timers") || [];
    const now = Date.now();
    const due = timers.filter(x => x.runAt <= now);
    const pending = timers.filter(x => x.runAt > now);
    const subscriptions = await this.ctx.storage.get("subscriptions") || [];
    const dead = new Set();
    webpush.setVapidDetails(this.env.VAPID_SUBJECT, this.env.VAPID_PUBLIC_KEY, this.env.VAPID_PRIVATE_KEY);
    for (const timer of due) {
      const targets = subscriptions.filter(x => x.deviceId === timer.deviceId);
      for (const target of targets) {
        try {
          await webpush.sendNotification(target.subscription, JSON.stringify({
            title: "Descanso concluído",
            body: "Seu tempo de descanso terminou. Pode seguir para a próxima série!",
            tag: "my-training-" + timer.timerId,
            data: { url: ALLOWED_ORIGIN + "/my-training/" }
          }));
        } catch (error) {
          if (error?.statusCode === 404 || error?.statusCode === 410) dead.add(target.subscription.endpoint);
          else if (error?.statusCode >= 500) pending.push({ ...timer, runAt: now + 60000 });
        }
      }
    }
    await this.ctx.storage.put("subscriptions", subscriptions.filter(x => !dead.has(x.subscription.endpoint)));
    await this.ctx.storage.put("timers", pending);
    await this.setNextAlarm(pending);
  }
}

function validId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{8,80}$/.test(value);
}
