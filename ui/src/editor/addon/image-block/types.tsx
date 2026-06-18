import { z } from "zod";

export type FileUploadAction = (params: { file: File }) => Promise<{ data?: { id: string, mime: string, url: string } }>;
import { ElementAddon } from "../types";
import {
  ImageBlockElementSchema,
  ImageItemSchema,
} from "./schema";

export type ImageBlockElement = z.infer<
  typeof ImageBlockElementSchema
>;

export type ImageItem = z.infer<
  typeof ImageItemSchema
>;

export type ImageBlockAddonParams = {
  fileUploadAction: FileUploadAction
};

export type ImageBlockAddon = ElementAddon<"image-block", ImageBlockAddonParams>;

export interface Upload {
  id: string;
  prevId: string | null; // Id of the prev item from this upload.
  item?: ImageItem;
  file: File;
}

export type ImageItemWithUpload = ImageItem & {
  upload?: Upload;
}