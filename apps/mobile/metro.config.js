/* eslint-env node */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// --- pnpm monorepo wiring -------------------------------------------------
// 1. Watch the whole workspace so edits in packages/shared trigger a rebuild.
config.watchFolders = [workspaceRoot];

// 2. Resolve from the app's own node_modules first, then the hoisted root.
//    Requires nodeLinker: hoisted in pnpm-workspace.yaml — see CLAUDE.md.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Only look in the paths above; do not walk up the tree guessing.
config.resolver.disableHierarchicalLookup = true;

// 4. Because we watch the workspace root, Metro would otherwise try to watch
//    the other apps' build output. Next.js rewrites apps/admin-web/.next
//    constantly in dev and Metro's watcher dies with ENOENT when a directory
//    vanishes mid-walk.
//
//    These patterns are ANCHORED to the workspace root and to our own
//    apps/* and packages/* directories on purpose. A loose pattern like
//    /\/dist\/.*/ also matches node_modules/<pkg>/dist and will break
//    resolution of any dependency that ships a dist folder — whatwg-fetch,
//    which react-native pulls in for the dev bundle, is one of them.
const esc = workspaceRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  new RegExp(`^${esc}/apps/[^/]+/\\.next/.*`),
  new RegExp(`^${esc}/apps/[^/]+/dist(-[^/]*)?/.*`),
  new RegExp(`^${esc}/apps/[^/]+/\\.expo/.*`),
  new RegExp(`^${esc}/(apps|packages)/[^/]+/\\.turbo/.*`),
  new RegExp(`^${esc}/\\.turbo/.*`),
  new RegExp(`^${esc}/\\.git/.*`),
];

module.exports = withNativeWind(config, { input: './global.css' });
