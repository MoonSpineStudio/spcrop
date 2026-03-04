import { describe, expect, it } from "vitest";

import type { GenerateRequest, GeneratedAsset, ProviderAdapter, ProviderId } from "../types";
import { runWithFallback } from "../provider-router";

function makeRequest(provider: ProviderId): GenerateRequest {
  const fallbackProvider: ProviderId = provider === "openai"
    ? "gemini"
    : provider === "gemini"
      ? "openrouter"
      : "openai";
  return {
    provider,
    mode: "text_to_image",
    prompt: "pixel fox",
    model: "model-a",
    outputCount: 1,
    fallbackProvider,
  };
}

function makeAsset(name: string): GeneratedAsset {
  return {
    mimeType: "image/png",
    blob: new Blob([name], { type: "image/png" }),
    thumbDataUrl: `data:image/png;base64,${btoa(name)}`,
    width: 64,
    height: 64,
  };
}

describe("runWithFallback", () => {
  it("routes openrouter primary requests to the openrouter adapter", async () => {
    const calls: string[] = [];
    const openai: ProviderAdapter = {
      generate: async () => {
        calls.push("openai");
        return [makeAsset("openai")];
      },
    };
    const gemini: ProviderAdapter = {
      generate: async () => {
        calls.push("gemini");
        return [makeAsset("gemini")];
      },
    };
    const openrouter: ProviderAdapter = {
      generate: async () => {
        calls.push("openrouter");
        return [makeAsset("openrouter")];
      },
    };

    const result = await runWithFallback(
      makeRequest("openrouter"),
      {
        openai,
        gemini,
        openrouter,
      },
      undefined,
    );

    expect(result.providerUsed).toBe("openrouter");
    expect(calls).toEqual(["openrouter"]);
  });

  it("returns primary provider result when primary succeeds", async () => {
    const calls: ProviderId[] = [];
    const openai: ProviderAdapter = {
      generate: async () => {
        calls.push("openai");
        return [makeAsset("openai")];
      },
    };
    const gemini: ProviderAdapter = {
      generate: async () => {
        calls.push("gemini");
        return [makeAsset("gemini")];
      },
    };
    const openrouter: ProviderAdapter = {
      generate: async () => {
        calls.push("openrouter");
        return [makeAsset("openrouter")];
      },
    };

    const result = await runWithFallback(makeRequest("openai"), { openai, gemini, openrouter });

    expect(result.providerUsed).toBe("openai");
    expect(result.fallbackFrom).toBeNull();
    expect(result.assets).toHaveLength(1);
    expect(calls).toEqual(["openai"]);
  });

  it("falls back when primary fails and fallback is configured", async () => {
    const calls: ProviderId[] = [];
    const openai: ProviderAdapter = {
      generate: async () => {
        calls.push("openai");
        throw new Error("boom");
      },
    };
    const gemini: ProviderAdapter = {
      generate: async () => {
        calls.push("gemini");
        return [makeAsset("gemini")];
      },
    };
    const openrouter: ProviderAdapter = {
      generate: async () => {
        calls.push("openrouter");
        return [makeAsset("openrouter")];
      },
    };

    const result = await runWithFallback(makeRequest("openai"), { openai, gemini, openrouter });

    expect(result.providerUsed).toBe("gemini");
    expect(result.fallbackFrom).toBe("openai");
    expect(calls).toEqual(["openai", "gemini"]);
  });

  it("throws primary error when fallback is disabled", async () => {
    const openai: ProviderAdapter = {
      generate: async () => {
        throw new Error("primary failed");
      },
    };
    const gemini: ProviderAdapter = {
      generate: async () => [makeAsset("gemini")],
    };
    const openrouter: ProviderAdapter = {
      generate: async () => [makeAsset("openrouter")],
    };

    await expect(
      runWithFallback(
        {
          ...makeRequest("openai"),
          fallbackProvider: undefined,
        },
        { openai, gemini, openrouter },
      ),
    ).rejects.toThrow("primary failed");
  });
});
