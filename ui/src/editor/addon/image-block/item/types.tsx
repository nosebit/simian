import { CaptionProps } from "../caption";
import { ImageItem, ImageItemWithUpload, Upload } from "../types";

export interface ImageItemProps {
  className?: string;
  disabled?: boolean;
  item: ImageItemWithUpload;
  onUploadComplete: (result: { item: ImageItem; upload: Upload }) => void;
  onCaptionChange: CaptionProps["onValueChange"];
}

export type ImageBaseItemProps = ImageItemProps & React.HTMLAttributes<HTMLDivElement> & {
  isDragging?: boolean;
};