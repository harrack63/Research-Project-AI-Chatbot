import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

const maxFileSizeMb = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_MB ?? "10");
const safeMaxFileSizeMb = Number.isFinite(maxFileSizeMb) ? maxFileSizeMb : 10;
const maxFileSize = `${safeMaxFileSizeMb}MB` as const;

export const ourFileRouter = {
  documentUploader: f({
    pdf: { maxFileSize, maxFileCount: 1 },
    text: { maxFileSize, maxFileCount: 1 },
    blob: { maxFileSize, maxFileCount: 1 },
  })
    .middleware(async () => {
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return {
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileType: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
