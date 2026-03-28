import 'reflect-metadata';
import { Router } from 'express';
import {
  getHealthService,
  getHealthMonitor,
  getAlertConfigService,
} from '../services/serviceFactory';

const router = Router();

/**
 * @openapi
 * /health/status:
 *   get:
 *     tags: [Health]
 *     summary: Get current system health status
 *     security: []
 *     responses:
 *       200:
 *         description: System health status
 *       500:
 *         description: Health check failed
 */
router.get('/status', async (req, res) => {
  try {
    const healthService = getHealthService();
    const status = await healthService.getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

/**
 * @openapi
 * /health/metrics:
 *   get:
 *     tags: [Health]
 *     summary: Get detailed health metrics for all services
 *     security: []
 *     responses:
 *       200:
 *         description: Health metrics
 *       500:
 *         description: Failed to retrieve metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const monitor = getHealthMonitor();
    const metrics = monitor.getMetrics();
    res.json({ metrics });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve metrics',
    });
  }
});

/**
 * @openapi
 * /health/metrics/{service}:
 *   get:
 *     tags: [Health]
 *     summary: Get health metrics for a specific service
 *     security: []
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [database, redis, s3, twitter, youtube, facebook]
 *     responses:
 *       200:
 *         description: Service health metrics
 *       404:
 *         description: Service not found
 */
router.get('/metrics/:service', (req, res) => {
  try {
    const monitor = getHealthMonitor();
    const metrics = monitor.getMetrics(req.params.service);
    if (metrics.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.json({ metrics });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve metrics',
    });
  }
});

/**
 * @openapi
 * /health/config:
 *   get:
 *     tags: [Health]
 *     summary: Get alert configuration for all services
 *     security: []
 *     responses:
 *       200:
 *         description: Alert configuration map
 */
router.get('/config', (req, res) => {
  try {
    const alertConfigService = getAlertConfigService();
    const services = ['database', 'redis', 's3', 'twitter', 'youtube', 'facebook'];
    const config = Object.fromEntries(
      services.map((service) => [service, alertConfigService.getConfig(service)]),
    );
    res.json(config);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to retrieve config',
    });
  }
});

/**
 * @openapi
 * /health/config/{service}:
 *   put:
 *     tags: [Health]
 *     summary: Update alert configuration for a service
 *     parameters:
 *       - in: path
 *         name: service
 *         required: true
 *         schema:
 *           type: string
 *           enum: [database, redis, s3, twitter, youtube, facebook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Alert configuration object
 *     responses:
 *       200:
 *         description: Configuration updated
 *       500:
 *         description: Failed to update config
 */
router.put('/config/:service', (req, res) => {
  try {
    const alertConfigService = getAlertConfigService();
    const { service } = req.params;
    const config = req.body;

    alertConfigService.setConfig(service, config);
    res.json({ message: 'Configuration updated', config });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update config',
    });
  }
});

export default router;
