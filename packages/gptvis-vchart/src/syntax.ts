/** Parser-only entry point. It must not load VChart, React, or browser code. */
export { isVisSyntax, parse, readConfig } from './parser.js';
export type { ParsedConfig, ParseOptions } from './parser.js';
