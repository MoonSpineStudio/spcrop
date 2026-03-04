import OpenAI, { APIError } from "openai";

import { makeGeneratedAsset } from "../image-utils";
import type { GenerateRequest, ProviderAdapter } from "../types";

export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
}

export function normalizeOpenAIBaseUrl(baseUrl: string): string {
  const trimmed = (baseUrl || "https://api.openai.com").trim();
  const noTrailingSlash = trimmed.replace(/\/+$/, "");
  if (!noTrailingSlash) {
    return "https://api.openai.com/v1";
  }
  if (/\/v1$/i.test(noTrailingSlash)) {
    return noTrailingSlash;
  }
  return `${noTrailingSlash}/v1`;
}

function toOpenAIError(error: unknown): Error {
  if (error instanceof APIError) {
    return new Error(`OpenAI request failed (${error.status ?? "unknown"}): ${error.message}`);
  }
  if (error instanceof Error) {
    return new Error(`OpenAI request failed: ${error.message}`);
  }
  return new Error("OpenAI request failed");
}

function b64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function responseDataToAssets(data: Array<{ b64_json?: string | null; url?: string | null }>): Promise<Blob[]> {
  const blobs: Blob[] = [];
  for (const item of data) {
    if (item.b64_json) {
      blobs.push(b64ToBlob(item.b64_json, "image/png"));
      continue;
    }
    if (item.url) {
      const fetched = await fetch(item.url);
      if (!fetched.ok) {
        throw new Error(`OpenAI image URL download failed (${fetched.status})`);
      }
      blobs.push(await fetched.blob());
    }
  }
  return blobs;
}

export function createOpenAIAdapter(getConfig: () => OpenAIConfig): ProviderAdapter {
  return {
    async generate(req: GenerateRequest, signal?: AbortSignal) {
      const config = getConfig();
      const apiKey = config.apiKey.trim();
      if (!apiKey) {
        throw new Error("Missing OpenAI API key");
      }

      const client = new OpenAI({
        apiKey,
        baseURL: normalizeOpenAIBaseUrl(config.baseUrl || "https://api.openai.com"),
        dangerouslyAllowBrowser: true,
      });

      const prompt = req.negativePrompt
        ? `${req.prompt}\n\nNegative prompt: ${req.negativePrompt}`
        : req.prompt;

      try {
        if (req.mode === "text_to_image") {
          const response = await client.images.generate({
            model: req.model,
            prompt,
            n: Math.max(1, req.outputCount),
            response_format: "b64_json",
          }, {
            signal,
          });

          const blobs = await responseDataToAssets(response.data ?? []);
          if (blobs.length === 0) {
            throw new Error("OpenAI returned no images");
          }
          const assets = [];
          for (const blob of blobs) {
            // eslint-disable-next-line no-await-in-loop
            assets.push(await makeGeneratedAsset(blob));
          }
          return assets;
        }

        if (!req.imageSource) {
          throw new Error("Image source is required for image-to-image mode");
        }

        const source = new File(
          [req.imageSource.blob],
          req.imageSource.name || "source.png",
          {
            type: req.imageSource.mimeType || req.imageSource.blob.type || "image/png",
          },
        );
        const response = await client.images.edit({
          model: req.model,
          prompt,
          n: Math.max(1, req.outputCount),
          response_format: "b64_json",
          image: source,
        }, {
          signal,
        });

        const blobs = await responseDataToAssets(response.data ?? []);
        if (blobs.length === 0) {
          throw new Error("OpenAI returned no images");
        }
        const assets = [];
        for (const blob of blobs) {
          // eslint-disable-next-line no-await-in-loop
          assets.push(await makeGeneratedAsset(blob));
        }
        return assets;
      } catch (error) {
        throw toOpenAIError(error);
      }
    },
  };
}
