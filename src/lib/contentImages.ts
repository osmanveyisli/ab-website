import { existsSync } from "node:fs";
import { join, normalize } from "node:path";
import type { ContentImage } from "./types";

const publicDir = normalize(join(process.cwd(), "public"));

export function hasContentImage(image: ContentImage | null | undefined) {
  if (!image?.src) return false;
  if (/^https?:\/\//.test(image.src)) return true;
  if (!image.src.startsWith("/")) return true;

  const publicPath = normalize(join(publicDir, image.src));
  return publicPath.startsWith(publicDir) && existsSync(publicPath);
}

export function imageObjectPosition(position?: string) {
  return `object-position: ${position || "center center"}`;
}
