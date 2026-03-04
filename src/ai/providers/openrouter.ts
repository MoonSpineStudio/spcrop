import { OpenRouter } from "@openrouter/sdk";

import { dataUrlToBlob, makeGeneratedAsset } from "../image-utils";
import type { GenerateRequest, ProviderAdapter } from "../types";

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
}

type OpenRouterUserContent = string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; imageUrl: { url: string } }
>;

export function normalizeOpenRouterBaseUrl(baseUrl: string): string {
  const trimmed = (baseUrl || "https://openrouter.ai/api/v1").trim();
  const noTrailingSlash = trimmed.replace(/\/+$/, "");
  if (!noTrailingSlash) {
    return "https://openrouter.ai/api/v1";
  }
  if (/\/api\/v1$/i.test(noTrailingSlash) || /\/v1$/i.test(noTrailingSlash)) {
    return noTrailingSlash;
  }
  if (/\/api$/i.test(noTrailingSlash)) {
    return `${noTrailingSlash}/v1`;
  }
  return `${noTrailingSlash}/api/v1`;
}

function buildPromptText(req: GenerateRequest): string {
  if (!req.negativePrompt) {
    return req.prompt;
  }
  return `${req.prompt}\n\nNegative prompt: ${req.negativePrompt}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }
      reject(new Error("Failed to read image source"));
    };
    reader.onerror = () => reject(new Error("Failed to read image source"));
    reader.readAsDataURL(blob);
  });
}

async function imageUrlToBlob(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    return dataUrlToBlob(url);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`OpenRouter image URL download failed (${response.status})`);
  }
  return await response.blob();
}

function toOpenRouterError(error: unknown): Error {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = String((error as { statusCode?: unknown }).statusCode ?? "unknown");
    const message = String((error as { message?: unknown }).message ?? "request failed");
    return new Error(`OpenRouter request failed (${statusCode}): ${message}`);
  }
  if (error instanceof Error) {
    return new Error(`OpenRouter request failed: ${error.message}`);
  }
  return new Error("OpenRouter request failed");
}

export function createOpenRouterAdapter(getConfig: () => OpenRouterConfig): ProviderAdapter {
  return {
    async generate(req: GenerateRequest, signal?: AbortSignal) {
      const config = getConfig();
      const apiKey = config.apiKey.trim();
      if (!apiKey) {
        throw new Error("Missing OpenRouter API key");
      }

      const client = new OpenRouter({
        apiKey,
        serverURL: normalizeOpenRouterBaseUrl(config.baseUrl),
      });

      const prompt = buildPromptText(req);
      const runs = Math.max(1, req.outputCount);
      const blobs: Blob[] = [];

      try {
        let sourceImageDataUrl: string | undefined;
        if (req.mode === "image_to_image") {
          if (!req.imageSource) {
            throw new Error("Image source is required for image-to-image mode");
          }
          sourceImageDataUrl = await blobToDataUrl(req.imageSource.blob);
        }

        for (let i = 0; i < runs; i++) {
          const content: OpenRouterUserContent = sourceImageDataUrl
            ? [
              { type: "text", text: prompt },
              { type: "image_url", imageUrl: { url: sourceImageDataUrl } },
            ]
            : prompt;

          // eslint-disable-next-line no-await-in-loop
          const response = await client.chat.send({
            chatGenerationParams: {
              model: req.model,
              stream: false,
              modalities: ["image"],
              messages: [
                {
                  role: "user",
                  content,
                },
              ],
            },
          }, {
            signal,
          });

          const imageUrls: string[] = [];
          for (const choice of response.choices ?? []) {
            for (const image of choice.message.images ?? []) {
              if (image.imageUrl?.url) {
                imageUrls.push(image.imageUrl.url);
              }
            }
          }

          for (const url of imageUrls) {
            // eslint-disable-next-line no-await-in-loop
            const blob = await imageUrlToBlob(url);
            blobs.push(blob);
            if (blobs.length >= runs) {
              break;
            }
          }
          if (blobs.length >= runs) {
            break;
          }
        }
      } catch (error) {
        throw toOpenRouterError(error);
      }

      if (blobs.length === 0) {
        throw new Error("OpenRouter returned no images");
      }

      const assets = [];
      for (const blob of blobs) {
        // eslint-disable-next-line no-await-in-loop
        assets.push(await makeGeneratedAsset(blob));
      }
      return assets;
    },
  };
}
