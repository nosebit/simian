import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FC } from "react";

import { ImageBaseItem } from "./base";
import { ImageItemProps } from "./types";

export const ImageDraggableItem: FC<ImageItemProps> = (props) => {
  const { disabled, item } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled,
  });

  return (
    <ImageBaseItem
      {...props}
      isDragging={isDragging}
      ref={setNodeRef}
      {...(!disabled ? attributes : {})}
      {...(!disabled ? listeners : {})}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    />
  );
}