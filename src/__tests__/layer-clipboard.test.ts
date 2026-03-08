import { describe, expect, it } from "vitest";

import { buildLayerClipboardPayload, placeLayerClipboardPayload } from "../layer-clipboard";

describe("layer clipboard payload", () => {
  it("stores layer offsets relative to top-left anchor", () => {
    const payload = buildLayerClipboardPayload([
      { name: "A", width: 100, height: 80, x: 40, y: 60, rotation: 0, image: "a" },
      { name: "B", width: 50, height: 50, x: 180, y: 140, rotation: 0.1, image: "b" },
    ]);
    expect(payload).not.toBeNull();
    expect(payload?.anchor).toEqual({ x: 40, y: 60 });
    expect(payload?.items.map((item) => ({ name: item.name, offsetX: item.offsetX, offsetY: item.offsetY }))).toEqual([
      { name: "A", offsetX: 0, offsetY: 0 },
      { name: "B", offsetX: 140, offsetY: 80 },
    ]);
  });

  it("places pasted layers by origin while preserving relative layout", () => {
    const payload = buildLayerClipboardPayload([
      { name: "A", width: 100, height: 80, x: 40, y: 60, rotation: 0, image: "a" },
      { name: "B", width: 50, height: 50, x: 180, y: 140, rotation: 0.1, image: "b" },
    ]);
    if (!payload) {
      throw new Error("payload should be created");
    }
    const placed = placeLayerClipboardPayload(payload, { x: 64, y: 96 });
    expect(placed.map((item) => ({ name: item.name, x: item.x, y: item.y }))).toEqual([
      { name: "A", x: 64, y: 96 },
      { name: "B", x: 204, y: 176 },
    ]);
  });
});
