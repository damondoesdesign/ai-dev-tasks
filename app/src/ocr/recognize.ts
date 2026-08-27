import { createNode } from '../model/tree'
import type { ParsedNode } from '../model/parse'

export function parsedToNodes(parsed: ParsedNode[]): ReturnType<typeof createNode>[] {
  return parsed.map((p) =>
    createNode(p.title, {
      packed: p.packed ?? false,
      qty: p.qty,
      children: parsedToNodes(p.children),
    }),
  )
}

export async function ocrImage(file: Blob, onProgress?: (value: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(file)
    return data.text ?? ''
  } finally {
    await worker.terminate()
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(file.name)
}
