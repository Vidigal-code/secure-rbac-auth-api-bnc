/**
 * Testes unitários de `security.utils`.
 *
 * Objetivo:
 * - Normalização de resource (ex.: "/dashboard/")
 * - Extração de resource do Request (inclui remover o prefixo "/api")
 */
import {
  extractResourceFromRequest,
  normalizeResource,
} from '../../shared/security/security.utils';

describe('security.utils', () => {
  describe('normalizeResource', () => {
    it('normaliza vazio para "/"', () => {
      expect(normalizeResource('')).toBe('/');
      expect(normalizeResource('   ')).toBe('/');
      expect(normalizeResource(undefined as any)).toBe('/');
    });

    it('garante leading slash e remove trailing slash (exceto raiz)', () => {
      expect(normalizeResource('dashboard')).toBe('/dashboard');
      expect(normalizeResource('/dashboard')).toBe('/dashboard');
      expect(normalizeResource('/dashboard/')).toBe('/dashboard');
      expect(normalizeResource('/dashboard///')).toBe('/dashboard');
      expect(normalizeResource('/')).toBe('/');
      expect(normalizeResource('///')).toBe('/');
    });
  });

  describe('extractResourceFromRequest', () => {
    it('usa baseUrl + route.path (ignorando "/" do route)', () => {
      const req = {
        baseUrl: '/dashboard',
        route: { path: '/' },
        path: '/api/dashboard',
      };
      expect(extractResourceFromRequest(req)).toBe('/dashboard');
    });

    it('concatena baseUrl + route.path quando route.path != "/"', () => {
      const req = {
        baseUrl: '/users',
        route: { path: '/:id' },
        path: '/api/users/1',
      };
      expect(extractResourceFromRequest(req)).toBe('/users/:id');
    });

    it('faz fallback para req.path', () => {
      const req = { path: '/api/relatorios' };
      expect(extractResourceFromRequest(req)).toBe('/relatorios');
    });

    it('faz fallback final para "/"', () => {
      expect(extractResourceFromRequest({})).toBe('/');
      expect(extractResourceFromRequest(null as any)).toBe('/');
    });

    it('remove o prefixo "/api" quando presente', () => {
      expect(extractResourceFromRequest({ path: '/api' })).toBe('/');
      expect(extractResourceFromRequest({ path: '/api/dashboard' })).toBe(
        '/dashboard',
      );
    });
  });
});
