import type { ImageInput } from "@/lib/recipe/types";

const MAX_EDGE = 1568; // Claude downsizes anything larger, so don't upload it.

/** Downscale screenshots/photos to JPEG and base64 them for the import endpoint. */
export async function prepareImages(files: File[]): Promise<ImageInput[]> {
  return Promise.all(
    files.map(async (file) => {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      return { mediaType: "image/jpeg" as const, data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
    }),
  );
}
