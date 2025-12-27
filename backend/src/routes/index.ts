import { Router } from 'express';
import authRoutes from './auth';
import stravaRoutes from './strava';
import activitiesRoutes from './activities';
import analyticsRoutes from './analytics';
import strengthRoutes from './strength';
import settingsRoutes from './settings';
import profileRoutes from './profile';
import gearRoutes from './gear';
import plansRoutes from './plans';
import resourcesRoutes from './resources';
import nutritionRoutes from './nutrition';
import importRoutes from './import';

const router = Router();

// Root API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Triforce API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        strava: '/api/strava',
        activities: '/api/activities',
        analytics: '/api/analytics',
        strength: '/api/strength',
        settings: '/api/settings',
        profile: '/api/profile',
        gear: '/api/gear',
        plans: '/api/plans',
        resources: '/api/resources',
        nutrition: '/api/nutrition',
        import: '/api/import',
      },
    },
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/strava', stravaRoutes);
router.use('/activities', activitiesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/strength', strengthRoutes);
router.use('/settings', settingsRoutes);
router.use('/profile', profileRoutes);
router.use('/gear', gearRoutes);
router.use('/plans', plansRoutes);
router.use('/resources', resourcesRoutes);
router.use('/nutrition', nutritionRoutes);
router.use('/import', importRoutes);

export default router;
