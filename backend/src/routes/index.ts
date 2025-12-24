import { Router } from 'express';
import authRoutes from './auth';
import stravaRoutes from './strava';
import activitiesRoutes from './activities';

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

// TODO: Add more routes in subsequent phases
// router.use('/analytics', analyticsRoutes);
// router.use('/plans', plansRoutes);
// router.use('/strength', strengthRoutes);
// router.use('/settings', settingsRoutes);

export default router;
