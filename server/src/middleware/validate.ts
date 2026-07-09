import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';

type RequestSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

const formatIssues = (issues: z.ZodIssue[]) =>
  issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

export const validate = (schemas: RequestSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, schema] of Object.entries(schemas) as Array<[keyof RequestSchemas, ZodTypeAny | undefined]>) {
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          details: formatIssues(result.error.issues),
        });
      }

      Object.defineProperty(req, key, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    next();
  };
};
