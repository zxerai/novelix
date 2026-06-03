import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface SecretsFile {
  services: Record<string, { apiKey: string }>;
}

const SECRETS_DIR = ".jiaos";
const SECRETS_FILE = "secrets.json";

const LEGACY_SERVICE_ID_REMAP: Record<string, string> = {
  siliconflow: "siliconcloud",
};

function migrateLegacyServiceIds(secrets: SecretsFile): { data: SecretsFile; changed: boolean } {
  let changed = false;
  for (const [oldId, newId] of Object.entries(LEGACY_SERVICE_ID_REMAP)) {
    if (secrets.services[oldId] && !secrets.services[newId]) {
      secrets.services[newId] = secrets.services[oldId];
      delete secrets.services[oldId];
      changed = true;
    }
  }
  return { data: secrets, changed };
}

async function readSecretsRaw(projectRoot: string): Promise<SecretsFile> {
  try {
    const raw = await readFile(
      join(projectRoot, SECRETS_DIR, SECRETS_FILE),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as SecretsFile;
    if (!parsed || typeof parsed !== "object" || !parsed.services) {
      return { services: {} };
    }
    return parsed;
  } catch {
    return { services: {} };
  }
}

export async function loadSecrets(projectRoot: string): Promise<SecretsFile> {
  const raw = await readSecretsRaw(projectRoot);
  const { data, changed } = migrateLegacyServiceIds(raw);
  if (changed) await saveSecrets(projectRoot, data);
  return data;
}

export async function saveSecrets(
  projectRoot: string,
  secrets: SecretsFile,
): Promise<void> {
  const dir = join(projectRoot, SECRETS_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, SECRETS_FILE),
    JSON.stringify(secrets, null, 2),
    "utf-8",
  );
}

export async function getServiceApiKey(
  projectRoot: string,
  service: string,
): Promise<string | null> {
  // 1. secrets.json
  const secrets = await loadSecrets(projectRoot);
  const entry = secrets.services[service];
  if (entry?.apiKey) return entry.apiKey;

  // 2. Environment variable: MOONSHOT_API_KEY, DEEPSEEK_API_KEY, etc.
  const envKey = `${service.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}_API_KEY`;
  if (process.env[envKey]) return process.env[envKey]!;

  return null;
}
