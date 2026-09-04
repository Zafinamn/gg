import { handleUpload } from "@vercel/blob/client";

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
        if (!/^catalogs\/[a-f0-9-]{20,64}\.pdf$/i.test(pathname)) {
          throw new Error("Invalid catalog path.");
        }

        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ purpose: "catalog-share" }),
        };
      },
      onUploadCompleted: async () => {
        // No database write is required here. The pathname itself is the catalog ID.
      },
    });

    return Response.json(response);
  } catch (error: any) {
    console.error("Blob client token error:", error);
    return Response.json(
      { error: error?.message || "Blob upload token үүсгэж чадсангүй." },
      { status: 500 },
    );
  }
}
