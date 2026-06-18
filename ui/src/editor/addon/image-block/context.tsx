import { FileUploadAction } from "./types";
import { createContext, useContext } from "react";

////////////////////////////////////////////////////////////
// Image Block Context
////////////////////////////////////////////////////////////
export interface ImageBlockContextValue {
  fileUploadAction: FileUploadAction;
}

export const ImageBlockContext = createContext<
  ImageBlockContextValue
>({
  fileUploadAction: async () => {
    console.warn("fileUploadAction called outside of Provider");
    return {};
  },
});

export function useImageBlock() {
  return useContext(ImageBlockContext);
}

////////////////////////////////////////////////////////////
// Image Block Element Context
////////////////////////////////////////////////////////////
export type ItemFocus = {
  id: string;
  mode?: "none" | "expand";
}

export type ImageBlockElementContextValue = {
  blockId: string;
  itemsLength: number;
  focus: ItemFocus | null;
  setFocus: (focus: ItemFocus | null) => void;
};

export const ImageBlockElementContext = createContext<ImageBlockElementContextValue>({
  blockId: "",
  itemsLength: 0,
  focus: null,
  setFocus: () => {},
});

export function useImageBlockElement() {
  return useContext(ImageBlockElementContext);
}