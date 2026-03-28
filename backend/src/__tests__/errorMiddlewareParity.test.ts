/**
 * Error middleware response contract tests.
 *
 * The same suite runs against both implementations:
 *   - src/middleware/error.ts          (canonical)
 *   - src/shared/middleware/error.ts   (shared copy)
 *
 * Verifies: status codes, payload shape, stack visibility, requestId propagation.
 */

import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import request from 'supertest';
import {
  BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError,
  ConflictError, ValidationError, RateLimitError, InternalServerError,
  ServiceUnavailableError, DatabaseError, ExternalServiceError,
} from '../lib/errors';
import {
  BadRequestError as SBadRequestError, UnauthorizedError as SUnauthorizedError,
  ForbiddenError as SForbiddenError, NotFoundError as SNotFoundError,
  ConflictError as SConflictError, ValidationError as SValidationError,
  RateLimitError as SRateLimitError, InternalServerError as SInternalServerError,
  ServiceUnavailableError as SServiceUnavailableError, DatabaseError as SDatabaseError,
  ExternalServiceError as SExternalServiceError,
} from '../shared/lib/errors';

// ── Load both handlers ────────────────────────────────────────────────────────
import { errorHandler as canonicalHandler, notFoundHandler as canonicalNotFound } from '../middleware/error';
import { errorHandler as sharedHandler, notFoundHandler as sharedNotFound } from '../shared/middleware/error';

// ── Helpers ───────────────────────────────────────────────────────────────────

type ErrorFactory = {
  badRequest: () => Error; unauthorized: () => Error; forbidden: () => Error;
  notFound: () => Error; conflict: () => Error; validation: () => Error;
  rateLimit: () => Error; internal: () => Error; unavailable: () => Error;
  dbError: () => Error; external: () => Error;
};

const canonicalErrors: ErrorFactory = {
  badRequest:   () => new BadRequestError('bad input'),
  unauthorized: () => new UnauthorizedError(),
  forbidden:    () => new ForbiddenError(),
  notFound:     () => new NotFoundError('item missing'),
  conflict:     () => new ConflictError(),
  validation:   () => new ValidationError('invalid', { field: ['required'] }),
  rateLimit:    () => new RateLimitError('slow down', 60),
  internal:     () => new InternalServerError(),
  unavailable:  () => new ServiceUnavailableError(),
  dbError:      () => new DatabaseError(),
  external:     () => new ExternalServiceError('upstream down', 'stripe'),
};

const sharedErrors: ErrorFactory = {
  badRequest:   () => new SBadRequestError('bad input'),
  unauthorized: () => new SUnauthorizedError(),
  forbidden:    () => new SForbiddenError(),
  notFound:     () => new SNotFoundError('item missing'),
  conflict:     () => new SConflictError(),
  validation:   () => new SValidationError('invalid', { field: ['required'] }),
  rateLimit:    () => new SRateLimitError('slow down', 60),
  internal:     () => new SInternalServerError(),
  unavailable:  () => new SServiceUnavailableError(),
  dbError:      () => new SDatabaseError(),
  external:     () => new SExternalServiceError('upstream down', 'stripe'),
};

function makeApp(
  handler: ErrorRequestHandler,
  notFound: (req: Request, res: Response) => void,
  errors: ErrorFactory,
  env = 'test',
) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.requestId = 'req-test-id'; next(); });

  app.get('/bad-request',    () => { throw errors.badRequest(); });
  app.get('/unauthorized',   () => { throw errors.unauthorized(); });
  app.get('/forbidden',      () => { throw errors.forbidden(); });
  app.get('/not-found-err',  () => { throw errors.notFound(); });
  app.get('/conflict',       () => { throw errors.conflict(); });
  app.get('/validation',     () => { throw errors.validation(); });
  app.get('/rate-limit',     () => { throw errors.rateLimit(); });
  app.get('/internal',       () => { throw errors.internal(); });
  app.get('/unavailable',    () => { throw errors.unavailable(); });
  app.get('/db-error',       () => { throw errors.dbError(); });
  app.get('/external',       () => { throw errors.external(); });
  app.get('/plain-error',    () => { throw new Error('raw boom'); });
  app.get('/async-error',    (_req, _res, next) => {
    Promise.reject(errors.badRequest()).catch(next);
  });

  app.use(notFound);
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    handler(err, req, res, next);
    process.env.NODE_ENV = origEnv;
  });

  return app;
}

// ── Shared contract suite ─────────────────────────────────────────────────────

function errorMiddlewareContract(
  label: string,
  handler: ErrorRequestHandler,
  notFound: (req: Request, res: Response) => void,
  errors: ErrorFactory,
) {
  describe(`errorHandler [${label}]`, () => {

    // ── Status codes ──────────────────────────────────────────────────────────
    describe('status codes', () => {
      const cases: [string, number][] = [
        ['/bad-request', 400], ['/unauthorized', 401], ['/forbidden', 403],
        ['/not-found-err', 404], ['/conflict', 409], ['/validation', 422],
        ['/rate-limit', 429], ['/internal', 500], ['/unavailable', 503],
        ['/db-error', 500], ['/external', 502], ['/plain-error', 500],
      ];
      test.each(cases)('GET %s → %i', async (path, status) => {
        const app = makeApp(handler, notFound, errors);
        const res = await request(app).get(path);
        expect(res.status).toBe(status);
      });
    });

    // ── Payload shape ─────────────────────────────────────────────────────────
    describe('payload shape', () => {
      it('always has success:false, code, message, timestamp', async () => {
        const app = makeApp(handler, notFound, errors);
        const res = await request(app).get('/bad-request');
        expect(res.body).toMatchObject({
          success: false,
          code: 'BAD_REQUEST',
          message: 'bad input',
          timestamp: expect.any(String),
        });
      });

      it('ValidationError includes errors map', async () => {
        const app = makeApp(handler, notFound, errors);
        const res = await request(app).get('/validation');
        expect(res.status).toBe(422);
        expect(res.body.errors).toEqual({ field: ['required'] });
      });

      it('404 handler returns NOT_FOUND code and path in message', async () => {
        const app = makeApp(handler, notFound, errors);
        const res = await request(app).get('/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
        expect(res.body.message).toContain('/does-not-exist');
      });

      it('async errors are handled correctly', async () => {
        const app = makeApp(handler, notFound, errors);
        const res = await request(app).get('/async-error');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('BAD_REQUEST');
      });
    });

    // ── requestId propagation ─────────────────────────────────────────────────
    describe('requestId propagation', () => {
      const routes = [
        '/bad-request', '/unauthorized', '/internal', '/plain-error', '/does-not-exist',
      ];
      test.each(routes)('requestId present in response for %s', async (path) => {
        const app = makeApp(handler, notFound, errors);
        const res = await request(app).get(path);
        expect(res.body.requestId).toBe('req-test-id');
      });
    });

    // ── Stack visibility ──────────────────────────────────────────────────────
    describe('stack visibility', () => {
      it('stack is included in development', async () => {
        const app = makeApp(handler, notFound, errors, 'development');
        const res = await request(app).get('/bad-request');
        expect(res.body.stack).toBeDefined();
      });

      it('stack is omitted in production', async () => {
        const app = makeApp(handler, notFound, errors, 'production');
        const res = await request(app).get('/bad-request');
        expect(res.body.stack).toBeUndefined();
      });
    });

    // ── 500 message masking ───────────────────────────────────────────────────
    describe('500 message masking', () => {
      it('masks 500 message in production', async () => {
        const app = makeApp(handler, notFound, errors, 'production');
        const res = await request(app).get('/internal');
        expect(res.status).toBe(500);
        expect(res.body.message).toBe('An unexpected error occurred');
      });

      it('exposes 500 message in development', async () => {
        const app = makeApp(handler, notFound, errors, 'development');
        const res = await request(app).get('/internal');
        expect(res.status).toBe(500);
        expect(res.body.message).not.toBe('An unexpected error occurred');
      });
    });
  });
}

// ── Run against both implementations ─────────────────────────────────────────
errorMiddlewareContract('canonical', canonicalHandler, canonicalNotFound, canonicalErrors);
errorMiddlewareContract('shared',    sharedHandler,    sharedNotFound,    sharedErrors);
