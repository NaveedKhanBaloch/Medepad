// Each prompt version number has its own colour everywhere it is shown:
// v1 green, v2 purple, v3 orange, v4 blue, v5 pink, v6 amber, v7 teal, v8 indigo, then it starts again.
const SOFT = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
];
const SOLID = [
  "bg-emerald-600 text-white border-emerald-600",
  "bg-violet-600 text-white border-violet-600",
  "bg-orange-500 text-white border-orange-500",
  "bg-sky-600 text-white border-sky-600",
  "bg-pink-600 text-white border-pink-600",
  "bg-amber-500 text-white border-amber-500",
  "bg-teal-600 text-white border-teal-600",
  "bg-indigo-600 text-white border-indigo-600",
];
const DOT = ["bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-sky-500", "bg-pink-500", "bg-amber-500", "bg-teal-500", "bg-indigo-500"];

const pick = (list: string[], version: number) => list[(Math.max(1, version) - 1) % list.length];

/** Light label colours for a version (e.g. "Version 2" badges). */
export const versionSoft = (version: number) => pick(SOFT, version);
/** Strong colours for the selected / in-use version. */
export const versionSolid = (version: number) => pick(SOLID, version);
/** Small coloured dot (used inside dropdown options). */
export const versionDot = (version: number) => pick(DOT, version);
