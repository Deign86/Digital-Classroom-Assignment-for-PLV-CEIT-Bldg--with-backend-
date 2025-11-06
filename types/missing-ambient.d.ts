// Ambient module declarations to satisfy transitive type references in dev environments
// These are intentionally minimal and safe — they only declare the module names so
// the TypeScript compiler stops searching for non-existent @types packages.

declare module 'glob';
declare module 'linkify-it';
declare module 'mdurl';
declare module 'rimraf';
declare module 'sizzle';
