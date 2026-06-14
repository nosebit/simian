import { z } from "zod";

import { ElementAddon } from "../types";
import { LatexInlineElementSchema } from "./schema";

export type LatexInlineElement = z.infer<
  typeof LatexInlineElementSchema
>;

export type LatexInlineAddon = ElementAddon<"latex-inline">;