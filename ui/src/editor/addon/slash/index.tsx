import { useCallback, useEffect, useMemo, useState } from "react";
import { DecoratedRange, Path, Transforms } from "slate";

import { useEditor } from "@/ui/editor/context";
import { voidAddon } from "../base";
import { CommandId, useCommandGroups } from "./command";
import { SlashContext } from "./context";
import { getSlash } from "./utils";
import {
  Slash,
  SlashAddon,
  SlashCommandGroupWithIndex,
  SlashCommandWithIndex
} from "./types";
import { SlashMenu } from "./menu";

/**
 * The context provider component.
 */
const ContextProvider: SlashAddon["ContextProvider"] = ({ addon, children }) => {
  const { editor } = useEditor();
  const [slash, setSlashBase] = useState<Slash | null>(addon.slash);
  const [cmdIdx, setCmdIdx] = useState(0);
  const allGroups = useCommandGroups();

  const setSlash = useCallback((slash: Slash | null) => {
    addon.slash = slash;
    setSlashBase(slash);
  }, [addon, setSlashBase]);

  const groups = useMemo(() => {
    let idx = 0;

    return allGroups.reduce(
      (groups, group) => {
        if (!slash?.query) { return [...groups, {
          ...group,
          commands: group.commands.map((cmd) => ({
            ...cmd,
            idx: idx++,
          })),
        }]; }

        const cmds = group.commands.filter((cmd) => (
          cmd.title.toLowerCase().startsWith(slash.query.toLowerCase())
        )).map((cmd) => ({...cmd, idx: idx++}));

        if (!cmds.length) {
          return groups;
        }

        return [...groups, {...group, commands: cmds}];
      },
      [] as SlashCommandGroupWithIndex[],
    );
  }, [slash, allGroups]);

  const commands = useMemo(() => groups.flatMap((group) => group.commands), [groups]);

  const moveSlashCmd = useCallback((direction: -1 | 1) => {
    setCmdIdx((prev) => {
      return Math.min(commands.length - 1, Math.max(0, prev + direction));
    });
  }, [commands.length]);

  const runSlashCmd = useCallback((aCmd?: SlashCommandWithIndex) => {
    const cmd = aCmd ?? commands.find((cmd) => cmd.idx === cmdIdx);

    if (slash?.range && cmd) {
      Transforms.select(editor, slash.range);
      Transforms.delete(editor);

      cmd.run();
      setSlash(null);
    }
  }, [editor, slash, commands, cmdIdx, setSlash]);

  useEffect(() => {
    setCmdIdx(0);
  }, [commands]);

  useEffect(() => {
    if (!slash) {
      setCmdIdx(0);
    }
  }, [slash]);

  // Update the addon.
  useEffect(() => {
    addon.setSlash = setSlash;
    addon.moveSlashCmd = moveSlashCmd;
    addon.runSlashCmd = runSlashCmd;
  }, [addon, setSlash, moveSlashCmd, runSlashCmd]);

  return (
    <SlashContext.Provider value={{
      commands,
      cmdIdx,
      groups,
      runSlashCmd,
      slash,
      setCmdIdx,
      setSlash
    }}>
      {children}

      <SlashMenu />
    </SlashContext.Provider>
  );
};

const Companion: SlashAddon["Companion"] = () => {
  const { editor } = useEditor();

  return (
    <div id={`slash-menu-root-${editor.id}`} />
  );
};

/**
 * Handle key down to navigate through slash commands menu.
 */
const onKeyDown: SlashAddon["onKeyDown"] = ({ addon }, evt) => {
  const {
    slash,
    setSlash,
    moveSlashCmd,
    runSlashCmd,
  } = addon;

  if (slash) {
    switch (evt.key) {
      case "ArrowDown": {
        evt.preventDefault();
        moveSlashCmd?.(1);
        break;
      }
      case "ArrowUp": {
        evt.preventDefault();
        moveSlashCmd?.(-1);
        break;
      }
      case "Enter": {
        evt.preventDefault();
        runSlashCmd?.();
        break;
      }
      case " ": {
        setSlash?.(null);
        break;
      }
      case "Escape": {
        evt.preventDefault();
        setSlash?.(null);
        break;
      }
    }
  }

  return false;
};

/**
 * Handle insert text to detect when a slash is typed so we
 * can show the slash menu.
 */
const insertText: SlashAddon["insertText"] = ({
  addon,
  editor,
  insertText,
  selection
}, text) => {
  const { slash, setSlash } = addon;

  // Keep growing the current slash.
  if (slash) {
    const slash = getSlash(editor, text);

    if (slash) {
      insertText(text);
      setSlash?.(slash);
      return true; // break following execution
    } else {
      setSlash?.(null);
    }
  }

  if (text === "/" && selection?.isCollapsed) {
    const slash = getSlash(editor, text);

    if (slash) {
      insertText(text);
      setSlash?.(slash);
      return true;
    }
  }

  return false;
};

/**
 * Handle delete backward to close the slash menu.
 */
const deleteBackward: SlashAddon["deleteBackward"] = ({
  addon,
  editor,
  deleteBackward,
}, unit) => {
  if (addon.slash) {
    // Checks if we remove the slash.
    const slash = getSlash(editor, "", true);

    if (slash) {
      addon.setSlash?.(slash);
    } else {
      addon.setSlash?.(null);
    }

    deleteBackward(unit);
    return true; // Break following execution
  }

  return false;
};

/**
 * Decorate the slash range so text addon can style it.
 */
const decorate: SlashAddon["decorate"] = ({ addon }, [, path]) => {
  const ranges: DecoratedRange[] = [];
  
  if (addon.slash?.range) {
    const { range } = addon.slash;

    if (Path.equals(path, range.anchor.path)) {
      ranges.push({
        ...range,
        slash: true,
      });
    }
  }

  return ranges;
};

/**
 * The addon builder.
 */
export function slash(opts?: {
  commandIds?: CommandId[];
}): SlashAddon {
  return voidAddon({
    id: "slash",
    commandIds: opts?.commandIds,
    decorate,
    deleteBackward,
    insertText,
    slash: null,
    setSlash: () => {},
    onKeyDown,

    Companion,
    ContextProvider,
  });
}

export * from "./types";