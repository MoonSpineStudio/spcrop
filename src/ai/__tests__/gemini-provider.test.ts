import { describe, expect, it } from "vitest";

import { normalizeGeminiBaseUrl } from "../providers/gemini";

describe("normalizeGeminiBaseUrl", () => {
  it("keeps host-only base URL", () => {
    expect(normalizeGeminiBaseUrl("https://generativelanguage.googleapis.com")).toEqual({
      baseUrl: "https://generativelanguage.googleapis.com",
    });
  });

  it("splits base URL and version when URL contains version suffix", () => {
    expect(normalizeGeminiBaseUrl("https://generativelanguage.googleapis.com/v1beta")).toEqual({
      baseUrl: "https://generativelanguage.googleapis.com",
      apiVersion: "v1beta",
    });
  });
});
