import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToR2 } from '@/lib/storage/r2';
import { requireAdmin } from '@/lib/auth-guard';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 MB max upload size
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

// Map sharp's detected format → safe extension + canonical mime
const FORMAT_MAP: Record<string, { ext: string; mime: string }> = {
  jpeg: { ext: '.jpg', mime: 'image/jpeg' },
  png: { ext: '.png', mime: 'image/png' },
  webp: { ext: '.webp', mime: 'image/webp' },
  gif: { ext: '.gif', mime: 'image/gif' },
  avif: { ext: '.avif', mime: 'image/avif' },
};

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  try {
    if (!process.env.R2_ACCOUNT_ID) {
      console.error('[admin/upload] Missing R2_ACCOUNT_ID or other R2 credentials');
      return NextResponse.json({ error: 'File upload storage is not configured' }, { status: 500 });
    }

    if (!request.body) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }

    // Read stream into buffer, enforcing size cap independent of (spoofable) Content-Length.
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      if (receivedLength > MAX_UPLOAD_SIZE) {
        return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
      }
    }

    const fileBuffer = Buffer.concat(chunks);

    // Validate this is genuinely an image by inspecting its bytes,
    // NOT by trusting the client's Content-Type header or filename.
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(fileBuffer).metadata();
    } catch {
      return NextResponse.json({ error: 'File is not a valid image' }, { status: 400 });
    }

    const detected = metadata.format ? FORMAT_MAP[metadata.format] : undefined;
    if (!detected) {
      return NextResponse.json(
        { error: `Unsupported image format: ${metadata.format ?? 'unknown'}` },
        { status: 400 }
      );
    }

    // Generate the filename server-side using the detected extension.
    // Client-supplied filename is ignored to avoid path traversal / extension spoofing.
    const safeFilename = `upload${detected.ext}`;

    const result = await uploadToR2(fileBuffer, safeFilename, detected.mime);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error uploading to Cloudflare R2:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
