import { issueSignedToken, presignUrl } from "@vercel/blob";

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json();
    const pathname = body?.pathname;
    const contentType = body?.contentType || "application/pdf";

    if (typeof pathname !== "string" || !/^catalogs\/[a-f0-9-]{20,64}\.pdf$/i.test(pathname)) {
      return Response.json({ error: "Invalid catalog path." }, { status: 400 });
    }

    if (contentType !== "application/pdf") {
      return Response.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: 100 * 1024 * 1024,
      validUntil: Date.now() + 10 * 60 * 1000,
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "put",
      pathname,
      access: "public",
      allowedContentTypes: ["application/pdf"],
      maximumSizeInBytes: 100 * 1024 * 1024,
      validUntil: signedToken.validUntil,
    });

    return Response.json({ presignedUrl });
  } catch (error: any) {
    console.error("Blob presigned URL error:", error);
    return Response.json(
      {
        error: error?.message || "Presigned URL үүсгэж чадсангүй.",
      },
      { status: 500 },
    );
  }
}
