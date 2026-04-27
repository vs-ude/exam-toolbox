import { ZipWriter } from "@zip-js/zip-js";
import { walk } from "@std/fs";

/**
 * Creates a ZIP archive from all files inside `sourceDirectory`.
 * Relative paths inside the ZIP are preserved.
 */
export async function createZipArchiveFromDirectory(
  sourceDirectory: string,
  zipFilePath: string,
): Promise<void> {
  const zipFile = await Deno.open(zipFilePath, {
    write: true,
    create: true,
    truncate: true,
  });

  const zipWriter = new ZipWriter(zipFile);

  try {
    for await (const entry of walk(sourceDirectory)) {
      if (!entry.isFile) continue;

      const relativePath = entry.path.substring(sourceDirectory.length + 1);
      const content = await Deno.readFile(entry.path);

      const contentStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(content);
          controller.close();
        },
      });

      await zipWriter.add(relativePath, contentStream);
    }

    await zipWriter.close();
  } catch (error) {
    try {
      await zipWriter.close();
    } catch {
      // ignore close errors during failure path
    }
    throw error;
  } finally {
    zipFile.close();
  }
}
