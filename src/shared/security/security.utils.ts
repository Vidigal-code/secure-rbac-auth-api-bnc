/**
 * Normaliza um resource no formato esperado (ex: "/dashboard").
 */
export function normalizeResource(resource: string): string {
  const trimmed = (resource ?? '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  // Remove trailing slash (exceto raiz)
  if (withSlash.length <= 1) return withSlash;
  const noTrailing = withSlash.replace(/\/+$/, '');
  // Caso especial: input como "///" vira string vazia após remover trailing slashes.
  return noTrailing ? noTrailing : '/';
}

/**
 * Tenta extrair o "resource" (rota lógica) a partir do Request do Express/Nest.
 * Ex: GET /api/dashboard => "/dashboard"
 */
export function extractResourceFromRequest(req: any): string {
  const baseUrl = typeof req?.baseUrl === 'string' ? req.baseUrl : '';
  const routePath = typeof req?.route?.path === 'string' ? req.route.path : '';

  // Ex.: baseUrl "/dashboard" + routePath "/" => "/dashboard"
  const raw = `${baseUrl}${routePath === '/' ? '' : routePath}`;
  const normalized = normalizeResource(raw || req?.path || '/');

  // Nest globalPrefix: `api` (main.ts) não deve fazer parte do resource lógico do RBAC.
  // Ex.: "/api/dashboard" => "/dashboard"
  if (normalized === '/api') return '/';
  if (normalized.startsWith('/api/')) return normalized.slice('/api'.length);

  return normalized;
}
