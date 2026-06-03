import type { RouterContext } from "./context.js";
import {
  loadSecrets,
  saveSecrets,
  getAllEndpoints,
  resolveServicePreset,
  resolveServiceProviderFamily,
  resolveCoverProviderPreset,
  COVER_PROVIDER_PRESETS,
  coverSecretKey,
  GLOBAL_ENV_PATH,
} from "@actalk/jiaos-core";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

// ---- 服务配置本地函数 ----
interface ServiceConfigEntry {
  service: string;
  name?: string;
  baseUrl?: string;
  temperature?: number;
  apiFormat?: "chat" | "responses";
  stream?: boolean;
}

function isCustomServiceId(id: string): boolean {
  return id === "custom" || id.startsWith("custom:");
}
function serviceConfigKey(e: ServiceConfigEntry): string {
  return e.service === "custom" ? `custom:${e.name ?? "Custom"}` : e.service;
}
function compareServiceListItems(l: { service: string }, r: { service: string }): number {
  const p = ["kkaiapi", "openrouter", "newapi", "siliconcloud"];
  const lp = p.indexOf(l.service), rp = p.indexOf(r.service);
  return (lp !== -1 || rp !== -1) ? ((lp === -1 ? 999 : lp) - (rp === -1 ? 999 : rp)) : 0;
}
function isHeaderSafeApiKey(v: string): boolean {
  return !v || /^[\x21-\x7E]+$/.test(v);
}

async function loadRawConfig(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, "jiaos.json"), "utf-8")) as Record<string, unknown>;
}
async function saveRawConfig(root: string, config: Record<string, unknown>): Promise<void> {
  await writeFile(join(root, "jiaos.json"), JSON.stringify(config, null, 2), "utf-8");
}

// ---- 路由注册 ----
export function registerServiceRoutes(ctx: RouterContext): void {
  const { app, root, modelListCache } = ctx;

  app.get("/api/v1/services", async (c) => {
    const secrets = await loadSecrets(root);
    const services = getAllEndpoints().filter((ep) => ep.id !== "custom").map((ep) => ({
      service: ep.id, label: ep.label, group: ep.group,
      connected: Boolean(secrets.services[ep.id]?.apiKey),
    })).sort(compareServiceListItems);
    return c.json({ services });
  });

  app.delete("/api/v1/services/:service", async (c) => {
    const svc = c.req.param("service");
    const config = await loadRawConfig(root);
    const secrets = await loadSecrets(root);
    delete secrets.services[svc];
    await saveSecrets(root, secrets);
    modelListCache.clear();
    return c.json({ ok: true });
  });

  app.put("/api/v1/services/:service/secret", async (c) => {
    const service = c.req.param("service");
    const { apiKey } = await c.req.json<{ apiKey: string }>();
    const secrets = await loadSecrets(root);
    const trimmedKey = apiKey?.trim() ?? "";
    if (trimmedKey) {
      if (!isHeaderSafeApiKey(trimmedKey)) return c.json({ ok: false, error: "API Key 包含无效字符" }, 400);
      secrets.services[service] = { apiKey: trimmedKey };
    } else delete secrets.services[service];
    await saveSecrets(root, secrets);
    return c.json({ ok: true });
  });

  app.get("/api/v1/services/:service/secret", async (c) => {
    const secrets = await loadSecrets(root);
    return c.json({ apiKey: secrets.services[c.req.param("service")]?.apiKey ?? "" });
  });
}
