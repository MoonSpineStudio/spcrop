import { describe, expect, it } from "vitest";

import { normalizeOpenAIBaseUrl } from "../providers/openai";

describe("normalizeOpenAIBaseUrl", () => {
  it("adds /v1 for canonical API host", () => {
    expect(normalizeOpenAIBaseUrl("https://api.openai.com")).toBe("https://api.openai.com/v1");
  });

  it("removes trailing slash", () => {
    expect(normalizeOpenAIBaseUrl("https://api.openai.com/")).toBe("https://api.openai.com/v1");
  });

  it("keeps base URL that already includes /v1", () => {
    expect(normalizeOpenAIBaseUrl("https://api.openai.com/v1")).toBe("https://api.openai.com/v1");
    expect(normalizeOpenAIBaseUrl("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1");
  });
});
