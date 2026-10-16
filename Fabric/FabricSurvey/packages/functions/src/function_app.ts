import {
  AudienceType,
  UserDataFunctions,
  type RayfinContext,
} from '@microsoft/fabric-user-data-functions';
import type { UniversalAppSchema } from '@rayfin-app/shared';

const udf = new UserDataFunctions();

/**
 * Screenshots land in the PromotionIntelligenceFeedback_LH Lakehouse in the
 * "Fabric Data App" workspace, under Files/screenshots/YYYY/MM/DD/. The app
 * identity (the Fabric app item's owner) needs write access to that Lakehouse.
 */
const ONELAKE_FILES =
  'https://onelake.dfs.fabric.microsoft.com/d099e005-e033-42c6-bb60-00071d466680/519a5978-a8dd-454f-b072-980c764fb255/Files';
const FOLDER = 'screenshots';
const MAX_BYTES = 4 * 1024 * 1024;
const DFS_HEADERS = { 'x-ms-version': '2023-11-03' };
const REQUEST_TIMEOUT_MS = 30_000;

/** Accepted image types, identified by their leading bytes rather than the browser's claim. */
const SIGNATURES: { ext: string; matches: (b: Buffer) => boolean }[] = [
  { ext: 'png', matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'gif', matches: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    ext: 'webp',
    matches: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export interface UploadScreenshotResult {
  ok: boolean;
  /** Lakehouse-relative path, e.g. Files/screenshots/2026/10/13/<id>.png. Set when ok. */
  path?: string;
  /** Safe, user-facing reason. Set when not ok. */
  error?: string;
}

async function dfs(url: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...DFS_HEADERS, ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

udf.func(
  'uploadScreenshot',
  async (
    ctx: RayfinContext<UniversalAppSchema, AudienceType.Storage>,
    dataBase64: string
  ): Promise<UploadScreenshotResult> => {
    // Base64 is ~4/3 of the binary size; reject oversize input before decoding.
    if (typeof dataBase64 !== 'string' || dataBase64.length === 0) {
      return { ok: false, error: 'The screenshot was empty.' };
    }
    if (dataBase64.length > Math.ceil((MAX_BYTES * 4) / 3) + 4) {
      return { ok: false, error: 'Screenshots must be 4 MB or smaller.' };
    }
    const bytes = Buffer.from(dataBase64, 'base64');
    if (bytes.length === 0 || bytes.length > MAX_BYTES) {
      return { ok: false, error: 'Screenshots must be 4 MB or smaller.' };
    }
    const kind = SIGNATURES.find((s) => s.matches(bytes));
    if (!kind) {
      return { ok: false, error: 'Only PNG, JPEG, GIF or WebP images can be attached.' };
    }

    const now = new Date();
    const day = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`;
    const relative = `${FOLDER}/${day}/${crypto.randomUUID()}.${kind.ext}`;
    const url = `${ONELAKE_FILES}/${relative}`;
    const token = ctx.Tokens.Storage;

    try {
      const created = await dfs(`${url}?resource=file`, { method: 'PUT', headers: { 'Content-Length': '0' } }, token);
      if (!created.ok) throw new Error(`create ${created.status}`);
      const appended = await dfs(
        `${url}?action=append&position=0`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes },
        token
      );
      if (!appended.ok) throw new Error(`append ${appended.status}`);
      const flushed = await dfs(
        `${url}?action=flush&position=${bytes.length}`,
        { method: 'PATCH', headers: { 'Content-Length': '0' } },
        token
      );
      if (!flushed.ok) throw new Error(`flush ${flushed.status}`);
    } catch (err) {
      // Status codes only: never log tokens, URLs with credentials, or the image.
      console.error('uploadScreenshot failed:', err instanceof Error ? err.message : 'unknown error');
      return { ok: false, error: "Couldn't save the screenshot to Fabric. Please try again." };
    }

    return { ok: true, path: `Files/${relative}` };
  },
  []
);
