import {
	generateReactHelpers,
	generateUploadButton,
	generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "~/app/api/uploadthing/core";
import { basePath } from "~/lib/global_vars";

const uploadthingRouteUrl = `${basePath}/api/uploadthing`;

export const UploadButton = generateUploadButton<OurFileRouter>({
	url: uploadthingRouteUrl,
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
	url: uploadthingRouteUrl,
});

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>({
	url: uploadthingRouteUrl,
});
