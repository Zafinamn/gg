import { handleUploadPresigned, issueSignedToken } from "@vercel/blob/client";

export default async function handler(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    const jsonResponse = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, _clientPayload, _multipart) => {
        if (!/^catalogs\/[a-f0-9-]+\.pdf$/i.test(pathname)) {
          throw new Error("Invalid catalog path.");
        }

        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          validUntil: Date.now() + 10 * 60 * 1000,
        });

        return { token };
      },
    });

    return Response.json(jsonResponse);
  } catch (error: any) {
    console.error("Blob presigned upload error:", error);
    return Response.json(
      { error: error?.message || "Upload token үүсгэж чадсангүй." },
      { status: 400 },
    );
  }
}
