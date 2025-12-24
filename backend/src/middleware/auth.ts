import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createUnauthorizedError } from './errorHandler';
import { prisma } from '../config/database';

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Extended request with user
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw createUnauthorizedError('No authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw createUnauthorizedError('Invalid authorization format');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw createUnauthorizedError('No token provided');
    }

    // Verify token
    const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createUnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createUnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Optional auth middleware
 * Attaches user if token is valid, but doesn't require it
 */
export function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;

    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch {
    // Token invalid, but that's okay for optional auth
    next();
  }
}

/**
 * Verify user exists middleware
 * Should be used after authMiddleware
 */
export async function verifyUserExists(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      throw createUnauthorizedError('No user in request');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true },
    });

    if (!user) {
      throw createUnauthorizedError('User not found');
    }

    next();
  } catch (error) {
    next(error);
  }
}

export default authMiddleware;
