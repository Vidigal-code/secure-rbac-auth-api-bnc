import 'reflect-metadata';

// Defaults seguros para testes (evita comportamento dependente de env e facilita mocks).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.JWE_SECRET ??= 'test-jwe-secret';
process.env.TOKEN_ISSUER ??= 'secure-rbac-auth-api-bnc-test';
process.env.TOKEN_AUDIENCE ??= 'secure-rbac-auth-api-bnc-test';
