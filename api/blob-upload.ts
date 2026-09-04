import { handleUpload } from "@vercel/blob/client";

function validCatalogPath(pathname: string): boolean {
  return /^catalogs\/[a-f0-9-]{20,64}\.pdf$/i.test(pathname);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Vercel's /api/*.ts Node.js runtime passes an IncomingMessage here,
    // not the Web Request object. The previous implementation called
    // request.json(), which caused: "request.json is not a function".
    // Convert the incoming request to a Web Request for @vercel/blob/client.
    const body = typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body ?? {});

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (Array.isArray(value)) headers.set(key, value.join(","));
      else if (value != null) headers.set(key, String(value));
    }

    const webRequest = new Request(
      `https://${req.headers?.host || "localhost"}${req.url || "/api/blob-upload"}`,
      { method: "POST", headers, body },
    );

    const response = await handleUpload({
      body,
      request: webRequest,
      onBeforeGenerateToken: async (pathname: string) => {
        if (!validCatalogPath(pathname)) {
          throw new Error("Invalid catalog path.");
        }

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ purpose: "catalog-share" }),
        };
      },
      onUploadCompleted: async ({ blob }: any) => {
        console.info("Catalog upload completed:", blob?.pathname || "unknown");
      },
    });

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Blob upload endpoint error:", error);
    const message = error?.message || "Blob upload тохиргоонд алдаа гарлаа.";
    return res.status(500).json({ error: message });
  }
}
