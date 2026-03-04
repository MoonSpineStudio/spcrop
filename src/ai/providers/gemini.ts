import { GoogleGenAI, Modality } from "@google/genai";

import { makeGeneratedAsset } from "../image-utils";
import type { GenerateRequest, ProviderAdapter } from "../types";

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiBaseUrlConfig {
  baseUrl?: string;
  apiVersion?: string;
}

const GEMINI_VERSION_SUFFIX_RE = /\/(v1alpha|v1beta|v1)$/i;

export function normalizeGeminiBaseUrl(baseUrl: string): GeminiBaseUrlConfig {
  const trimmed = (baseUrl || "").trim();
  const noTrailingSlash = trimmed.replace(/\/+$/, "");
  if (!noTrailingSlash) {
    return {};
  }
  const versionMatch = noTrailingSlash.match(GEMINI_VERSION_SUFFIX_RE);
  if (!versionMatch) {
    return { baseUrl: noTrailingSlash };
  }
  const normalizedBaseUrl = noTrailingSlash.replace(GEMINI_VERSION_SUFFIX_RE, "");
  return {
    baseUrl: normalizedBaseUrl,
    apiVersion: versionMatch[1].toLowerCase(),
  };
}

function b64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const data = await blob.arrayBuffer();
  const bytes = new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function toGeminiError(error: unknown): Error {
  if (error && typeof error === "object" && "status" in error) {
    const status = String((error as { status?: unknown }).status ?? "unknown");
    const message = String((error as { message?: unknown }).message ?? "request failed");
    return new Error(`Gemini request failed (${status}): ${message}`);
  }
  if (error instanceof Error) {
    return new Error(`Gemini request failed: ${error.message}`);
  }
  return new Error("Gemini request failed");
}

function buildPromptText(req: GenerateRequest): string {
  if (!req.negativePrompt) {
    return req.prompt;
  }
  return `${req.prompt}\n\nAvoid: ${req.negativePrompt}`;
}

export function createGeminiAdapter(getConfig: () => GeminiConfig): ProviderAdapter {
  return {
    async generate(req: GenerateRequest, signal?: AbortSignal) {
      const config = getConfig();
      const apiKey = config.apiKey.trim();
      if (!apiKey) {
        throw new Error("Missing Gemini API key");
      }

      const base = normalizeGeminiBaseUrl(config.baseUrl);
      const client = new GoogleGenAI({
        apiKey,
        apiVersion: base.apiVersion,
        httpOptions: base.baseUrl
          ? {
            baseUrl: base.baseUrl,
          }
          : undefined,
      });

      const parts: GeminiPart[] = [
        {
          text: buildPromptText(req),
        },
      ];

      if (req.mode === "image_to_image") {
        if (!req.imageSource) {
          throw new Error("Image source is required for image-to-image mode");
        }
        parts.push({
          inlineData: {
            mimeType: req.imageSource.mimeType || "image/png",
            data: await blobToBase64(req.imageSource.blob),
          },
        });
      }

      try {
        const payload = await client.models.generateContent({
          model: req.model,
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
            candidateCount: Math.max(1, req.outputCount),
            abortSignal: signal,
          },
        });

        const blobs: Blob[] = [];
        for (const candidate of payload.candidates ?? []) {
          for (const part of candidate.content?.parts ?? []) {
            if (part.inlineData?.data) {
              blobs.push(b64ToBlob(part.inlineData.data, part.inlineData.mimeType || "image/png"));
            }
          }
        }

        if (blobs.length === 0) {
          throw new Error("Gemini returned no images");
        }

        const assets = [];
        for (const blob of blobs) {
          // eslint-disable-next-line no-await-in-loop
          assets.push(await makeGeneratedAsset(blob));
        }
        return assets;
      } catch (error) {
        throw toGeminiError(error);
      }
    },
  };
}
