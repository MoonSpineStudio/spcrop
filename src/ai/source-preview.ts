import type { GenerationMode, ImageSourceKind } from "./types";

export interface SourcePreviewHintInput {
  mode: GenerationMode;
  sourceKind: ImageSourceKind;
  hasCropSource: boolean;
  hasActiveLayerSource: boolean;
  hasGallerySource: boolean;
  hasUploadedFileSource: boolean;
}

export interface SourcePreviewHint {
  visible: boolean;
  title: string;
  emptyMessage: string | null;
}

const SOURCE_KIND_TITLE: Record<ImageSourceKind, string> = {
  crop: "当前框选",
  active_layer: "当前活动图层",
  gallery_item: "素材区选中图",
  uploaded_file: "上传文件",
};

const SOURCE_KIND_EMPTY_MESSAGE: Record<ImageSourceKind, string> = {
  crop: "当前没有可用框选区域",
  active_layer: "请先选中活动图层",
  gallery_item: "请先在素材候选区选择一张来源图",
  uploaded_file: "请先上传图生图来源文件",
};

function hasSourceForKind(input: SourcePreviewHintInput): boolean {
  if (input.sourceKind === "crop") {
    return input.hasCropSource;
  }
  if (input.sourceKind === "active_layer") {
    return input.hasActiveLayerSource;
  }
  if (input.sourceKind === "gallery_item") {
    return input.hasGallerySource;
  }
  return input.hasUploadedFileSource;
}

export function describeSourcePreviewHint(input: SourcePreviewHintInput): SourcePreviewHint {
  const title = SOURCE_KIND_TITLE[input.sourceKind];
  if (input.mode !== "image_to_image") {
    return {
      visible: false,
      title,
      emptyMessage: null,
    };
  }
  return {
    visible: true,
    title,
    emptyMessage: hasSourceForKind(input) ? null : SOURCE_KIND_EMPTY_MESSAGE[input.sourceKind],
  };
}
