type UnknownRecord = Record<string, unknown>;

export interface ContractEndpointLike {
  endpoint: string;
  method: string;
  version?: string;
  response?: unknown;
  request?: unknown;
  example?: unknown;
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export function isContractEndpointEntry(value: unknown): value is ContractEndpointLike {
  if (!isObject(value)) {
    return false;
  }

  return typeof value.endpoint === 'string' && typeof value.method === 'string';
}

export function getContractExportName(contractModule: UnknownRecord): string | null {
  const exportNames = Object.keys(contractModule);
  const namedContractExports = exportNames.filter(name =>
    name.endsWith('Contract') || name.endsWith('Contracts')
  );

  if (namedContractExports.length === 1) {
    return namedContractExports[0];
  }

  if (namedContractExports.length > 1) {
    const nonAliasExports = namedContractExports.filter(
      name => name !== 'default' && !name.startsWith('initial')
    );
    if (nonAliasExports.length === 1) {
      return nonAliasExports[0];
    }
    return namedContractExports[0];
  }

  return null;
}

export function getContractEndpointEntries(
  contract: UnknownRecord
): Array<[string, ContractEndpointLike]> {
  return Object.entries(contract).filter(([, entry]) => isContractEndpointEntry(entry)) as Array<
    [string, ContractEndpointLike]
  >;
}

export function getNonEndpointEntryNames(contract: UnknownRecord): string[] {
  return Object.entries(contract)
    .filter(([, entry]) => !isContractEndpointEntry(entry))
    .map(([name]) => name);
}

export function getSuccessStatus(response: unknown): number | undefined {
  if (!isObject(response)) {
    return undefined;
  }

  const success = response.success;
  if (!isObject(success)) {
    return undefined;
  }

  if (typeof success.status === 'number') {
    return success.status;
  }

  if (typeof success.statusCode === 'number') {
    return success.statusCode;
  }

  return undefined;
}

interface ErrorResponseLike {
  status: number;
  code: string;
  message?: string;
}

export function extractErrorResponses(response: unknown): ErrorResponseLike[] {
  if (!isObject(response)) {
    return [];
  }

  const rawErrors = response.errors;
  if (Array.isArray(rawErrors)) {
    return rawErrors.filter((error): error is ErrorResponseLike => {
      if (!isObject(error)) {
        return false;
      }
      return typeof error.status === 'number' && typeof error.code === 'string';
    });
  }

  if (isObject(rawErrors)) {
    const normalized: ErrorResponseLike[] = [];
    for (const value of Object.values(rawErrors)) {
      if (!isObject(value)) {
        continue;
      }

      const status =
        typeof value.status === 'number'
          ? value.status
          : typeof value.statusCode === 'number'
            ? value.statusCode
            : undefined;
      const code =
        typeof value.code === 'string'
          ? value.code
          : typeof value.error === 'string'
            ? value.error
            : undefined;
      const message = typeof value.message === 'string' ? value.message : undefined;

      if (status && code) {
        normalized.push({ status, code, message });
      }
    }

    return normalized;
  }

  return [];
}
