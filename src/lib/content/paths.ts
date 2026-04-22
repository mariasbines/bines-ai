import 'server-only';
import path from 'node:path';

export const DEFAULT_CONTENT_ROOT = path.resolve(process.cwd(), 'content');

export function contentPaths(root: string = DEFAULT_CONTENT_ROOT) {
  return {
    root,
    fieldworkDir: path.join(root, 'fieldwork'),
    postcardsDir: path.join(root, 'postcards'),
    nowFile: path.join(root, 'now.mdx'),
    tasteFile: path.join(root, 'taste.mdx'),
  };
}
