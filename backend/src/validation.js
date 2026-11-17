// Input validation schemas (zod). Every endpoint validates its body before use.
import { z } from 'zod';

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'username must be at least 3 characters')
    .max(32, 'username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'username may contain only letters, numbers, _ and -'),
  password: z
    .string()
    .min(8, 'password must be at least 8 characters')
    .max(200, 'password must be at most 200 characters'),
});

export const noteSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200, 'title too long'),
  content: z.string().max(10000, 'content too long').default(''),
});

/**
 * Express middleware factory: validate req.body against a schema, replacing it
 * with the parsed (coerced, trimmed) value or responding 400 with details.
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'validation failed',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    req.body = result.data;
    next();
  };
}
