// // For mobile.
// export const TextFixedMenu = () => {
//   const ref = useRef<HTMLDivElement | null>(null);
//   const editor = useSlate();
//   const { selection } = editor;
//   const focused = useFocused();

//   const shouldShow =
//     focused &&
//     selection &&
//     Range.isExpanded(selection) &&
//     Editor.string(editor, selection).trim() !== '';

//   const bottomNavbarHeight = useMemo(() => {
//       if (typeof window === "undefined") return 0;
//       const navbar = document.querySelector('[data-element="bottom-navbar"]') as HTMLElement;
//       if (!navbar) return 0;
//       return navbar.clientHeight;
//     }, []);

//   useEffect(() => {
//     if (!window.visualViewport) { return; }

//     const handleResize = () => {
//       if (ref.current) {
//         const viewport = window.visualViewport!;

//         // Calculate the distance from the top of visual viewport to
//         // the bottom of the layout viewport
//         const offset = window.innerHeight - viewport.height - viewport.offsetTop;

//         // Move the menu up by the amount the keyboard is taking up.
//         ref.current.style.bottom = `${offset}px`;
//       }
//     };

//     window.visualViewport.addEventListener("resize", handleResize);
//     window.visualViewport.addEventListener("scroll", handleResize);

//     return () => {
//       window.visualViewport?.removeEventListener("resize", handleResize);
//       window.visualViewport?.removeEventListener("scroll", handleResize);
//     };
//   }, [])

//   if (!shouldShow) return null;

//   return (
//     <div
//       ref={ref}
//       className={clsx([
//         "fixed left-4 right-4 z-50 flex gap-1 p-1 bg-black text-white rounded-lg shadow-xl transition-opacity duration-200",
//         bottomNavbarHeight > 0 ? "mb-2" : ""
//       ])}
//       style={{
//         bottom: bottomNavbarHeight,
//       }}
//       onMouseDown={(e) => e.preventDefault()} // Prevents losing focus from editor
//     >
//       <ToolbarButton icon={<Bold size={18} />} format="bold" />
//       <ToolbarButton icon={<Italic size={18} />} format="italic" />
//       <ToolbarButton icon={<Underline size={18} />} format="underline" />
//       <div className="w-px bg-gray-700 mx-1 my-1" />
//       <ToolbarButton icon={<Code size={18} />} format="code" />
//     </div>
//   );
// };
