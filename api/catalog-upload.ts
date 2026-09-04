import { put } from "@vercel/blob";

function validCatalogId(id: string): boolean {
  return /^[a-f0-9-]{20,64}$/i.test(id);
}

export default async function handler(request: Request): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const catalogId = String(form.get("catalogId") || "");

    if (!validCatalogId(catalogId)) {
      return Response.json({ error: "Буруу каталогийн ID." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return Response.json({ error: "PDF файл олдсонгүй." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return Response.json({ error: "Зөвхөн PDF файл оруулна уу." }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return Response.json(
        { error: "Энэ файл server upload-ийн хэмжээнээс том байна. Direct upload ашиглана уу." },
        { status: 413 },
      );
    }

    const blob = await put(`catalogs/${catalogId}.pdf`, file, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });

    return Response.json({
      id: catalogId,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Small PDF Blob upload error:", error);
    return Response.json(
      { error: error?.message || "PDF-г хадгалах үед алдаа гарлаа." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
