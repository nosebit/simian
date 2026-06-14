import { z } from "zod";
import { TextSchema } from "../text/schema";

export const LatexInlineElementSchema = z.object({
  id: z.string().describe(
    "A unique id representing this inline latex element inside the editor content",
  ),
  children: z.array(TextSchema).describe(
    "The LaTeX formula that compose this inline element.",
  ).length(1),
  mode: z.enum(["read", "write"]).describe(
    "The mode in which the latex should be displayed."
  ),
  type: z.literal("latex-inline"),
});