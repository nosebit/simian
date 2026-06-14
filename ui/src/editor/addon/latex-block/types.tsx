import { z } from "zod";

import { ElementAddon } from "../types";
import { LatexBlockElementSchema } from "./schema";

export type LatexBlockElement = z.infer<
  typeof LatexBlockElementSchema
>;

export type LatexBlockAddon = ElementAddon<"latex-block">;