import { issueSignedToken, presignUrl } from "@vercel/blob";

function validCatalogPath(pathname: string): boolean {
  return /^catalogs\/[a-f0-9-]{20,64}\.pdf$/i.test(pathname);
}

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const TOKEN_TTL_MS = 15 * 60 * 1000;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const pathname = String(req.body?.pathname || "");
    if (!validCatalogPath(pathname)) {
      return res.status(400).json({ error: "Буруу каталогийн зам." });
    }

    // IMPORTANT: do not use @vercel/blob/client here.
    // The project has a connected Blob store with OIDC + BLOB_STORE_ID,
    // but no BLOB_READ_WRITE_TOKEN. The signed-URL flow is designed to
    // work with OIDC and lets the browser upload directly to Blob.
    const validUntil = Date.now() + TOKEN_TTL_MS;

    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil,
      maximumSizeInBytes: MAX_FILE_SIZE,
      allowedContentTypes: ["application/pdf"],
      storeId: process.env.BLOB_STORE_ID,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      pathname,
      operation: "put",
      validUntil,
      maximumSizeInBytes: MAX_FILE_SIZE,
      allowedContentTypes: ["application/pdf"],
      access: "public",
    });

    return res.status(200).json({
      pathname,
      presignedUrl,
      expiresAt: validUntil,
    });
  } catch (error: any) {
    console.error("Blob presign endpoint error:", error);

    const message = error?.message || "Vercel Blob upload URL үүсгэж чадсангүй.";
    return res.status(500).json({ error: message });
  }
}
