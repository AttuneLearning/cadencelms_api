import * as fs from 'fs';
import * as path from 'path';
import app from '@/app';
import { getContractEndpointEntries, getContractExportName } from '../../scripts/contract-utils';

const SUPPORTED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export interface RouteSignature {
  method: string;
  path: string;
  source?: string;
}

interface ExpressLayer {
  name?: string;
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
  };
  handle?: {
    stack?: ExpressLayer[];
  };
  regexp?: RegExp;
  keys?: Array<{ name: string }>;
}

function normalizePath(rawPath: string): string {
  const withLeadingSlash = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, '/');
  const withoutTrailingSlash =
    collapsed.length > 1 && collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;

  // Parameter names are not semantically important for parity.
  return withoutTrailingSlash.replace(/:[^/]+/g, ':param');
}

function joinPaths(prefix: string, next: string): string {
  if (!next || next === '/') {
    return prefix || '/';
  }
  if (!prefix || prefix === '/') {
    return next.startsWith('/') ? next : `/${next}`;
  }
  return `${prefix.replace(/\/+$/, '')}/${next.replace(/^\/+/, '')}`;
}

function regexLayerToPath(layer: ExpressLayer): string {
  if (!layer.regexp) {
    return '';
  }

  let source = layer.regexp.source;
  source = source.replace(/^\^/, '').replace(/\$$/, '');
  source = source
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/, '')
    .replace(/\\\/\?\(\?=\/\|\$\)$/, '')
    .replace(/\(\?=\\\/\|\$\)$/, '')
    .replace(/\(\?=\/\|\$\)$/, '');

  let keyIndex = 0;
  const keyNames = layer.keys?.map(k => k.name) ?? [];
  const nextParamName = () => keyNames[keyIndex++] ?? 'param';

  source = source.replace(/\(\?:\\\/\(\[\^\/]\+\?\)\)/g, () => `/:${nextParamName()}`);
  source = source.replace(/\(\?:\/\(\[\^\/]\+\?\)\)/g, () => `/:${nextParamName()}`);
  source = source.replace(/\(\[\^\/]\+\?\)/g, () => `:${nextParamName()}`);

  source = source.replace(/\\\//g, '/');
  source = source.replace(/\\\./g, '.');
  source = source.replace(/\\-/g, '-');

  return source;
}

function collectRuntimeRoutes(
  stack: ExpressLayer[],
  prefix = '',
  accumulator: RouteSignature[] = []
): RouteSignature[] {
  for (const layer of stack) {
    if (layer.route) {
      const routePaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods)
        .filter(([, enabled]) => enabled)
        .map(([method]) => method.toUpperCase())
        .filter(method => SUPPORTED_METHODS.has(method));

      for (const routePath of routePaths) {
        const fullPath = normalizePath(joinPaths(prefix, routePath));
        for (const method of methods) {
          accumulator.push({ method, path: fullPath });
        }
      }
      continue;
    }

    if (layer.name === 'router' && layer.handle?.stack) {
      const mountPath = regexLayerToPath(layer);
      const nextPrefix = normalizePath(joinPaths(prefix, mountPath));
      collectRuntimeRoutes(layer.handle.stack, nextPrefix, accumulator);
    }
  }

  return accumulator;
}

export function getRuntimeRouteSignatures(): RouteSignature[] {
  const appStack = ((app as any)?._router?.stack ?? []) as ExpressLayer[];
  const allRoutes = collectRuntimeRoutes(appStack);

  const deduped = new Map<string, RouteSignature>();
  for (const route of allRoutes) {
    const key = `${route.method} ${route.path}`;
    if (!deduped.has(key)) {
      deduped.set(key, route);
    }
  }

  return [...deduped.values()].sort((a, b) =>
    `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`)
  );
}

export function getContractRouteSignatures(): RouteSignature[] {
  const contractsDir = path.join(__dirname, '../../contracts/api');
  const contractFiles = fs.readdirSync(contractsDir).filter(file => file.endsWith('.contract.ts'));
  const signatures: RouteSignature[] = [];

  for (const file of contractFiles) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const contractModule = require(path.join(contractsDir, file)) as Record<string, unknown>;
    const contractExportName = getContractExportName(contractModule);

    if (!contractExportName) {
      continue;
    }

    const contractObject = contractModule[contractExportName] as Record<string, unknown>;
    const endpointEntries = getContractEndpointEntries(contractObject);

    for (const [endpointName, endpoint] of endpointEntries) {
      const endpointRecord = endpoint as Record<string, unknown>;
      if (endpointRecord.internalOnly === true) {
        continue;
      }

      const method = (endpoint.method || '').toUpperCase();
      if (!SUPPORTED_METHODS.has(method)) {
        continue;
      }

      signatures.push({
        method,
        path: normalizePath(endpoint.endpoint),
        source: `${file}:${endpointName}`
      });
    }
  }

  return signatures.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}
