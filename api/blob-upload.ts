import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export default async function handler(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^catalogs\/[a-f0-9-]+\.pdf$/i.test(pathname)) {
          throw new Error('Invalid catalog path.');
        }

        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Catalog upload completed:', blob.pathname);
      },
    });

    return Response.json(jsonResponse);
  } catch (error: any) {
    console.error('Blob upload token error:', error);
    return Response.json(
      { error: error?.message || 'Upload token үүсгэж чадсангүй.' },
      { status: 400 },
    );
  }
}
