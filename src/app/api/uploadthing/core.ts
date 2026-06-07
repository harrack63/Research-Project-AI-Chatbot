import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

const maxFileSizeMb = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_MB ?? "10");
const supportedMaxFileSizes = [
  "1MB",
  "2MB",
  "4MB",
  "8MB",
  "16MB",
  "32MB",
  "64MB",
  "128MB",
  "256MB",
  "512MB",
  "1024MB",
] as const;

type SupportedMaxFileSize = (typeof supportedMaxFileSizes)[number];

function resolveMaxFileSize(): SupportedMaxFileSize {
  if (!Number.isFinite(maxFileSizeMb)) return "16MB";

  const roundedUp = supportedMaxFileSizes.find((size) => {
    const sizeMb = Number(size.replace("MB", ""));
    return sizeMb >= maxFileSizeMb;
  });

  return roundedUp ?? "1024MB";
}

const maxFileSize = resolveMaxFileSize();

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
