import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { TokenPayload } from '../../middleware/auth';
import { sanitizeUser } from '../../utils/helpers';
import { AppError, createValidationError, createUnauthorizedError } from '../../middleware/errorHandler';
import { AuthResponse, UserResponse } from '../../types';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<AuthResponse> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw createValidationError('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with settings and profile
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        settings: {
          create: {},
        },
        profile: {
          create: {},
        },
      },
      include: {
        settings: true,
        profile: true,
      },
    });

    // Generate token
    const token = this.generateToken(user);

    return {
      user: sanitizeUser(user) as UserResponse,
      token,
    };
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        settings: true,
        profile: true,
      },
    });

    if (!user) {
      throw createUnauthorizedError('Invalid credentials');
    }

    // Check if user has a password (might be OAuth-only user)
    if (!user.passwordHash) {
      throw createUnauthorizedError(
        'This account uses social login. Please sign in with Strava.'
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw createUnauthorizedError('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      user: sanitizeUser(user) as UserResponse,
      token,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        profile: true,
      },
    });

    if (!user) {
      return null;
    }

    return sanitizeUser(user) as UserResponse;
  }

  /**
   * Generate JWT token
   */
  generateToken(user: { id: string; email: string }): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    // Using type assertion to handle strict SignOptions typing in newer @types/jsonwebtoken
    return jwt.sign(
      payload, 
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw createUnauthorizedError('Cannot change password for this account');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw createUnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw createValidationError('New password must be at least 8 characters');
    }

    // Hash and update
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    data: { name?: string; email?: string }
  ): Promise<UserResponse> {
    // If updating email, check it's not taken
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          NOT: { id: userId },
        },
      });

      if (existing) {
        throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email.toLowerCase() }),
      },
      include: {
        settings: true,
        profile: true,
      },
    });

    return sanitizeUser(user) as UserResponse;
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId },
    });
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
