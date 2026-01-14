/**
 * Normaliza um resource no formato esperado (ex: "/dashboard").
 */
export function normalizeResource(resource: string): string {
  const trimmed = (resource ?? '').trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  // Remove trailing slash (exceto raiz)
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
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
  return normalizeResource(raw || req?.path || '/');
}
