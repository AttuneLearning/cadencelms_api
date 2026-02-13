import { getContractRouteSignatures, getRuntimeRouteSignatures } from './parity.utils';

describe('Contract/Runtime Route Parity', () => {
  it('maps every canonical contract endpoint to a mounted runtime route', () => {
    const runtimeRoutes = getRuntimeRouteSignatures();
    const runtimeRouteSet = new Set(runtimeRoutes.map(route => `${route.method} ${route.path}`));
    const contractRoutes = getContractRouteSignatures();

    const unmappedContracts = contractRoutes.filter(contractRoute => {
      const key = `${contractRoute.method} ${contractRoute.path}`;
      return !runtimeRouteSet.has(key);
    });

    const debugLines = unmappedContracts.map(route => {
      const source = route.source ? ` (${route.source})` : '';
      return `${route.method} ${route.path}${source}`;
    });

    expect(debugLines).toEqual([]);
  });
});
