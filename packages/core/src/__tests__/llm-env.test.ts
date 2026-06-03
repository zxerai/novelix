import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadLLMEnvLayers } from "../utils/llm-env.js";

describe("loadLLMEnvLayers", () => {
  let root = "";
  const previousGoogleKey = process.env.GOOGLE_API_KEY;

  afterEach(async () => {
    if (previousGoogleKey === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previousGoogleKey;

    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("exposes project .env variables through process.env for apiKeyEnv consumers", async () => {
    root = await mkdtemp(join(tmpdir(), "jiaos-llm-env-"));
    delete process.env.GOOGLE_API_KEY;
    await writeFile(join(root, ".env"), "GOOGLE_API_KEY=sk-from-project-env\n", "utf-8");

    const layers = await loadLLMEnvLayers(root);

    expect(layers.project.GOOGLE_API_KEY).toBe("sk-from-project-env");
    expect(process.env.GOOGLE_API_KEY).toBe("sk-from-project-env");
  });
});
