import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos.',
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Já existe um registro com estes dados.' });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Operação inválida por dependência de outro registro.' });
    }

    if (error.code === 'P2034') {
      return res.status(409).json({ error: 'Conflito de gravação. Tente novamente.' });
    }
  }

  console.error(error);
  return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
}
