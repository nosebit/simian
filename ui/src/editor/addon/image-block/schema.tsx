import { z } from "zod";

import { BlockBaseSchema } from "@/ui/editor/block/schema";
import { TextSchema } from "../text/schema";

export const ImageItemSchema = z.object({
  id: z.string().describe(
    "A unique id representing this image item inside the editor content.",
  ),
  alt: z.string().optional().describe(
    "A hidden description of this image to ensure web accessibility and improve user experience and search engine optimization (SEO)."
  ),
  caption: z.string().optional().nullable().describe(
    "A visible description of this image that should be displayed next to the image itself when rendering it."
  ),
  fileId: z.string().optional().describe(
    "The id of the file associated with this image and that should be used to display the image. This fileId has precedence over other display methods like using the url field to show the image."
  ),
  mime: z.string().describe(
    "The mime type of this image."
  ),
  url: z.url().optional().describe(
    "The url pointing to the image we should display."
  ),
  height: z.number().optional().describe(
    "The original full height of this image (i.e., not cropped or scaled)."
  ),
  width: z.number().optional().describe(
    "The original full width of this image (i.e., not cropped or scaled)."
  ),
});

export const ImageBlockElementSchema = BlockBaseSchema.extend({
  id: z.string().describe(
    "A unique id representing this image element inside the editor content",
  ),
  caption: z.string().optional().nullable().describe(
    "A global visible description of the whole image block that should be displayed next to the block itself when no item is focused."
  ),
  items: z.array(ImageItemSchema).describe(
    "The list of images that compose this image block."
  ),
  layout: z.enum(["grid", "carousel"]).optional().describe(
    "This defines how the image items should be displayed. " +
    "The grid layout works up to 4 items and present the images as a dynamic grid (more than 4 images will default to carousel mode). " +
    "When not explicitly provided we default based on how many items we have in this block. " +
    "If we have less than or equal 4 items we default to grid and otherwise we default to carousel."
  ),
  children: z.array(TextSchema).length(1).describe(
    "Image blocks are void elements so we do not accept any children but it seems slate needs this to properly work.",
  ),
  type: z.literal("image-block"),
});