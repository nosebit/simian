import clsx from "clsx";
import _ from "lodash";
import { GalleryHorizontal, LayoutGrid, UploadCloud } from "lucide-react";
import { nanoid } from "nanoid";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Transforms } from "slate";
import {
  ReactEditor,
  useSelected,
  useSlateStatic,
} from "slate-react";

import { contextualize } from "@/ui/editor/context";
import { ElementProps } from "@/ui/editor/types";

import { Block, BlockMenuItem } from "../../block";
import { ImageBlockElement, ImageItem, ImageItemWithUpload, Upload } from "./types";
import { ImageBlockGrid } from "./grid";
import { ImageBlockCarousel } from "./carousel";
import { ImageBlockElementContext, ItemFocus } from "./context";

export const ImageBlock = contextualize<ElementProps<"image-block">>()([
  "editor",
], ({
  attributes,
  children,
  editor,
  element,
}) => {
  const isEditorSelected = useSelected();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [focus, setFocusBase] = useState<ItemFocus | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = false;

  const isReadMode = editor.mode === "read";

  /**
   * The items are composed by real items from element and
   * the virtual items which are being uploaded or just got
   * uploaded. This is important to ensure image ordering.
   */
  const items = useMemo(() => {
    const sortedItems: ImageItemWithUpload[] = [...element.items];
    const positionMap = sortedItems.reduce((obj, item, idx) => ({
      ...obj,
      [item.id]: { idx, item },
    }), {} as {[id: string]: { idx: number; item: ImageItemWithUpload; }});

    // Incorporate the uploads into the items list.
    for (const upload of uploads) {
      if (positionMap[upload.id]) {
        sortedItems.splice(
          positionMap[upload.id].idx,
          1,
          {
            ...positionMap[upload.id].item,
            upload,
          }
        );
      } else {
        // Upload is not finished: we need to place a virtual
        // item at the proper position.
        const prevIdx = upload.prevId === null
          ? -1
          : positionMap[upload.prevId]?.idx ?? -2;

        const idx = prevIdx + 1; // after prev

        const uploadItem = {
          id: upload.id,
          mime: upload.file.type,
          upload,
        };
    
        sortedItems.splice(
          idx,
          0,
          uploadItem
        );

        positionMap[uploadItem.id] = { idx, item: uploadItem };
      }
    }

    return sortedItems;
  }, [element.items, uploads]);

  /**
   * Compute the layout.
   */
  const layout = useMemo(() => {
    return element.layout ?? (items.length <= 4 ? "grid" : "carousel");
  }, [element, items])
  
  // const sidebarWidth = useMemo(() => {
  //   if (typeof window === "undefined") return 0;
  //   const sidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement;
  //   if (!sidebar) return 0;
  //   return sidebar.clientWidth;
  // }, []);

  // const scaleProps = useMemo(() => {
  //   switch (element.scale) {
  //     case 'full':
  //       return {
  //         className: 'relative left-1/2 right-1/2 mx-auto w-screen -translate-x-1/2',
  //         style: {
  //           paddingLeft: sidebarWidth/2 + 10,
  //           paddingRight: sidebarWidth/2
  //         }
  //       };
  //     case 'large':
  //       return {
  //         className: 'relative left-1/2 right-1/2 mx-auto w-screen max-w-5xl -translate-x-1/2',
  //         style: {
  //           paddingLeft: sidebarWidth/2,
  //           paddingRight: sidebarWidth/2
  //         }
  //       };
  //     default:
  //       return {};
  //   }
  // }, [element.scale, sidebarWidth]);

  const setFocus = useCallback((focus: ItemFocus | null) => {
    setFocusBase(
      focus
        ? {
          ...focus,
          ...layout === "carousel"
            ? { mode: "expand" } // Always expand on focus for carousel.
            : {}
          }
        : null);
  }, [layout]);

  const handleImageSelect = useCallback((
    evt: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { files } = evt.target;
    if (!files || files.length === 0) return;

    // Append selected files.
    const lastItem = _.last(items);
    let prevId = lastItem?.id ?? null;

    // Add files to items if not there yet.
    const newUploads: Upload[] = [];

    for (const file of files) {
      const id = nanoid();

      // @todo - check if item was not added already.
      newUploads.push({
        id,
        file,
        prevId
      });

      prevId = id;
    }
    
    setUploads((prev) => [...prev, ...newUploads]);
  }, [items]);

  const handleUploadComplete = useCallback(({ item, upload }: {
    item: ImageItem;
    upload: Upload;
  }) => {
    setUploads((prev) => {
      const idx = prev.findIndex((anUpload) => upload.id === anUpload.id);

      if (idx >= 0) {
        const clone = [...prev];
        clone.splice(idx, 1, { ...prev[idx], item });

        return clone;
      }

      return prev;
    });
  }, []);

  const handleCaptionChange = useCallback((
    item: ImageItemWithUpload | null,
    value: string | null
  ) => {
    const id = item?.upload?.item?.id ?? item?.id;

    if (id) {
      // Update caption of the focused item.
      const items = [...element.items ?? []];
      const itemIdx = items.findIndex((item) => item.id === id);

      if (itemIdx >= 0) {
        items.splice(itemIdx, 1, {...items[itemIdx], caption: value})

        Transforms.setNodes(editor, {
          items,
        } as Partial<Node>, { at: ReactEditor.findPath(editor, element) });
      }

      return;
    }

    // Otherwise update the global caption.
    Transforms.setNodes(editor, {
      caption: value,
    } as Partial<Node>, { at: ReactEditor.findPath(editor, element) });
  }, [editor, element]);

  const changeLayout = useCallback((layout: ImageBlockElement["layout"]) => {
    if (!layout) { return; }

    // Wrap in a single atomic operation
    Transforms.setNodes(
      editor,
      { layout },
      { at: ReactEditor.findPath(editor, element) }
    );
  }, [editor, element]);

  const menuItems = useCallback((baseItems: BlockMenuItem[][]) => [
    ...baseItems,
    ...items.length > 1 ? [[{
      id: "layout-switcher",
      icon: layout === "grid"
        ? <GalleryHorizontal className="s-4" />
        : <LayoutGrid className="s-4" />,
      onClick: () => changeLayout(
        layout === "grid" ? "carousel" : "grid"
      ),
    }]] : []
  ], [items.length, layout, changeLayout]);

  useEffect(() => {
    const itemIds = (element.items ?? []).map((item) => item.id).filter((id) => id !== undefined);
    
    const [uploadItemIds, uploadItemMap] = uploads.reduce(([ids, obj], upload) => {
      // If the upload is not done yet we need to add a temporary item to ensure
      // the order is garanteed. First let's handle the case where the upload is
      // already done.
      if (upload.item?.id) {
        return [
          [...ids, upload.item?.id],
          {
            ...obj,
            [upload.item.id]: upload.item,
          }
        ];
      }

      return [ids, obj];
    }, [[], {}] as [string[], {[id: string]: ImageItem}]);

    // We only update when all images get successfully uploaded.
    // This is important to ensure the original order of the
    // selected images.
    if(uploadItemIds.length != uploads.length) { return; }

    const diffItemIds = _.difference(uploadItemIds, itemIds);
    
    if(diffItemIds.length > 0) {
      const newItems = diffItemIds.map((id) => uploadItemMap[id]);
      const allItems = [...element.items ?? [], ...newItems];

      Transforms.setNodes(editor, {
        layout: element.layout === "grid"
          ? allItems.length > 4
            ? "carousel"
            : "grid"
          : element.layout === "carousel"
            ? "carousel"
            : allItems.length <= 4
              ? "grid"
              : "carousel",
        items: allItems,
      } as Partial<Node>, { at: ReactEditor.findPath(editor, element) });
    }
  }, [editor, element, uploads]);

  return (
    <ImageBlockElementContext.Provider value={{
      blockId: (element as any).id,
      itemsLength: items.length,
      focus,
      setFocus,
    }}>
      <Block
        {...attributes}
        isResizable={items.length > 0}
        element={element}
        className={clsx([
          "mb-6 pb-4"
        ])}
        menuItems={menuItems}
      >
        <div
          contentEditable={false}
          className={clsx([
            "select-none",
          ])}
        >
          {items.length ? (
            <div
              className={clsx([
                "relative w-full overflow-hidden", // Added overflow-hidden to clip overlay corners
                "rounded-lg",
                isReadMode ? "" : "cursor-pointer"
              ])}

              // The following onMouseDown affects click behavior inside the
              // images displayed in the grid. Our original idea was to have it
              // in order to correctly focus on the image-block element on clicking
              // but removing it now so we can edit captions when a specific image
              // is displayed in full window mode.
              // onMouseDown={(e) => {
              //   // Ensure the editor is focused before setting selection.
              //   // This is crucial when clicking the image when the editor is unfocused.
              //   ReactEditor.focus(editor);

              //   // Prevent browser default actions (like auto-scroll/focus jump)
              //   // This is critical for void nodes to prevent jumping to the bottom
              //   e.preventDefault();
              //   e.stopPropagation();
                
              //   // Manually select the node. 
              //   // This ensures consistent selection even though we preventDefault above.
              //   const path = ReactEditor.findPath(editor, element);
              //   Transforms.select(editor, path);
              // }}
            >
              {/* Removed SELECTION OVERLAY per user request */}

              {layout === "grid" && !isMobile ? (
                <ImageBlockGrid
                  items={items}
                  caption={element.caption}
                  handleUploadComplete={handleUploadComplete}
                  onCaptionChange={handleCaptionChange}
                  onItemsMove={(newItems) => {
                    Transforms.setNodes(
                      editor,
                      { items: newItems },
                      { at: ReactEditor.findPath(editor, element) }
                    );
                  }}
                />
              ) : (
                <ImageBlockCarousel
                  items={items}
                  handleUploadComplete={handleUploadComplete}
                  onCaptionChange={handleCaptionChange}
                />
              )}
            </div>
          ) : (
            <div
              className={`
                flex flex-col items-center justify-center p-8 gap-2
                border-2 border-dashed rounded-lg cursor-pointer transition-colors
                outline-none focus:outline-none
                
                // LIGHT MODE STYLES
                border-gray-300 hover:bg-gray-50 
                text-gray-500 bg-white
                
                // DARK MODE STYLES
                dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800 
                dark:text-gray-400
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                <UploadCloud className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div className="text-sm font-medium">
                Click to upload image
              </div>

              {/* {element.alt && <span className="text-xs text-gray-400 dark:text-gray-500">Alt: {element.alt}</span>} */}

              {/* Hidden File Input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                multiple
                onChange={handleImageSelect}
              />
            </div>
          )}
        </div>

        {/* FIX: Render children (required by Slate for document model) 
            but hide it from the layout flow to prevent browser scroll jumping. 
            Converted inline style to Tailwind classes. */}
        <span className="absolute top-0 left-0 h-0 w-0 opacity-0 overflow-hidden">
          {children}
        </span>
      </Block>
    </ImageBlockElementContext.Provider>
  );
});