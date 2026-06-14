import { z } from "zod";

import { BlockBaseSchema } from "@/ui/editor/block/schema";
import { TextSchema } from "../text/schema";

export const LatexBlockElementSchema = BlockBaseSchema.extend({
  id: z.string().describe(
    "A unique id representing this divider element inside the editor content",
  ),
  children: z.array(TextSchema).describe(
    "The LaTeX formula that compose this block content.",
  ).length(1),
  mode: z.enum(["read", "write"]).describe(
    "The mode in which the latex should be displayed."
  ),
  type: z.literal("latex-block"),
});