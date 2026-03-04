import { describe, expect, it } from "vitest";

import { normalizeOpenRouterBaseUrl } from "../providers/openrouter";

describe("normalizeOpenRouterBaseUrl", () => {
  it("uses canonical base with /api/v1", () => {
    expect(normalizeOpenRouterBaseUrl("https://openrouter.ai")).toBe("https://openrouter.ai/api/v1");
  });

  it("keeps explicit /api/v1 unchanged", () => {
    expect(normalizeOpenRouterBaseUrl("https://openrouter.ai/api/v1")).toBe("https://openrouter.ai/api/v1");
  });
});
