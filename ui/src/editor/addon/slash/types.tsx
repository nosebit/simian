import { Range } from 'slate'

import { SlashAddonCommand, VoidAddon } from '../types'
import { SlashContextValue } from './context'
import { CommandId } from './command'

export interface Slash {
  range: Range | null
  query: string
}

//////////////////////////////////////////////////
// Slash Addon
//////////////////////////////////////////////////
export type SlashAddon = VoidAddon<
  'slash',
  Pick<SlashContextValue, 'slash' | 'setSlash'> & {
    commandIds?: CommandId[]
    moveSlashCmd?: (direction: -1 | 1) => void
    runSlashCmd?: () => void
  }
>

//////////////////////////////////////////////////
// Slash Command Group
//////////////////////////////////////////////////

export type SlashCommand = SlashAddonCommand<string, string> & { addon: any }
export type SlashCommandWithIndex = SlashCommand & { idx: number }

export type SlashCommandGroup = {
  id: string
  title: string
  commands: SlashCommand[]
}

export type SlashCommandGroupWithIndex = Omit<SlashCommandGroup, 'commands'> & {
  commands: SlashCommandWithIndex[]
}

// //////////////////////////////////////////////////
// // Slash Commands
// //////////////////////////////////////////////////
// export interface SlashCommandRunOptions {
//   getElement: () => Omit<Element, "id">;
//   behavior?: 'replace' | 'insert';
// }

// type SlashCommandBase = {
//   id: string;
//   icon?: React.ReactNode;
//   shortcut?: React.ReactNode;
//   title: React.ReactNode;
//   description?: string;
// };

// export type SlashCommandWithRunOpts = SlashCommandBase & {
//   runOpts: SlashCommandRunOptions;
// };

// type SlashCommand = SlashCommandBase & {
//   run: () => void;
// };

// export type SlashCommandGroup = {
//   id: string;
//   title: string;
//   commands: SlashCommand[];
// };

// export type SlashCommandGroupWithRunOpts = Omit<SlashCommandGroup, "commands"> & {
//   commands: SlashCommandWithRunOpts[];
// }

// export type SlashCommandWithIndex = SlashCommand & {
//   idx: number;
// };

// export type SlashCommandGroupWithIndex = {
//   id: string;
//   title: string;
//   commands: SlashCommandWithIndex[];
// };
