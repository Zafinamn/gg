import { handleUpload } from "@vercel/blob/client";

function validCatalogPath(pathname: string): boolean {
  return /^catalogs\/[a-f0-9-]{20,64}\.pdf$/i.test(pathname);
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();

    const response = await handleUpload({
      body,
      request,
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

    return Response.json(response);
  } catch (error: any) {
    console.error("Blob upload endpoint error:", error);
    const message = error?.message || "Blob upload тохиргоонд алдаа гарлаа.";
    return Response.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
