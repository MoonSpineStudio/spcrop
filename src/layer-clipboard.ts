export interface LayerClipboardLike<TImage> {
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  image: TImage;
}

export interface LayerClipboardPayloadItem<TImage> {
  name: string;
  width: number;
  height: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  image: TImage;
}

export interface LayerClipboardPayload<TImage> {
  anchor: {
    x: number;
    y: number;
  };
  items: LayerClipboardPayloadItem<TImage>[];
}

export interface PlacedLayerClipboardItem<TImage> {
  name: string;
  width: number;
  height: number;
  rotation: number;
  x: number;
  y: number;
  image: TImage;
}

export function buildLayerClipboardPayload<TImage>(
  layers: LayerClipboardLike<TImage>[],
): LayerClipboardPayload<TImage> | null {
  if (layers.length === 0) {
    return null;
  }
  let minX = layers[0].x;
  let minY = layers[0].y;
  for (const layer of layers) {
    minX = Math.min(minX, layer.x);
    minY = Math.min(minY, layer.y);
  }
  return {
    anchor: {
      x: minX,
      y: minY,
    },
    items: layers.map((layer) => ({
      name: layer.name,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      offsetX: layer.x - minX,
      offsetY: layer.y - minY,
      image: layer.image,
    })),
  };
}

export function placeLayerClipboardPayload<TImage>(
  payload: LayerClipboardPayload<TImage>,
  origin: { x: number; y: number },
): PlacedLayerClipboardItem<TImage>[] {
  return payload.items.map((item) => ({
    name: item.name,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
    x: origin.x + item.offsetX,
    y: origin.y + item.offsetY,
    image: item.image,
  }));
}
