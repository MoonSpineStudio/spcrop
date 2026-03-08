import { describe, expect, it } from "vitest";

import { describeSourcePreviewHint } from "../source-preview";

describe("source preview hint", () => {
  it("hides preview in text-to-image mode", () => {
    const hint = describeSourcePreviewHint({
      mode: "text_to_image",
      sourceKind: "crop",
      hasCropSource: false,
      hasActiveLayerSource: false,
      hasGallerySource: false,
      hasUploadedFileSource: false,
    });
    expect(hint.visible).toBe(false);
  });

  it("shows missing-source message for unavailable crop", () => {
    const hint = describeSourcePreviewHint({
      mode: "image_to_image",
      sourceKind: "crop",
      hasCropSource: false,
      hasActiveLayerSource: true,
      hasGallerySource: true,
      hasUploadedFileSource: true,
    });
    expect(hint.title).toBe("当前框选");
    expect(hint.emptyMessage).toBe("当前没有可用框选区域");
  });

  it("shows no empty message when selected gallery source exists", () => {
    const hint = describeSourcePreviewHint({
      mode: "image_to_image",
      sourceKind: "gallery_item",
      hasCropSource: false,
      hasActiveLayerSource: false,
      hasGallerySource: true,
      hasUploadedFileSource: false,
    });
    expect(hint.title).toBe("素材区选中图");
    expect(hint.emptyMessage).toBeNull();
  });

  it("shows missing-source message for missing uploaded file", () => {
    const hint = describeSourcePreviewHint({
      mode: "image_to_image",
      sourceKind: "uploaded_file",
      hasCropSource: false,
      hasActiveLayerSource: false,
      hasGallerySource: false,
      hasUploadedFileSource: false,
    });
    expect(hint.title).toBe("上传文件");
    expect(hint.emptyMessage).toBe("请先上传图生图来源文件");
  });
});
