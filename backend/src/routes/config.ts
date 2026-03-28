import { Router, Request, Response } from 'express';
import { dynamicConfigService, ConfigType } from '../services/DynamicConfigService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * @openapi
 * /config:
 *   get:
 *     tags: [Config]
 *     summary: Get all dynamic configuration values (admin)
 *     responses:
 *       200:
 *         description: Configuration map
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = dynamicConfigService.getStatus();
    const configs: Record<string, any> = {};

    for (const key of status.cachedKeys) {
      configs[key] = dynamicConfigService.get(key);
    }

    res.json({
      success: true,
      status,
      configs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * @openapi
 * /config/refresh:
 *   post:
 *     tags: [Config]
 *     summary: Manually refresh the configuration cache from the database (admin)
 *     responses:
 *       200:
 *         description: Cache refreshed
 *       401:
 *         description: Unauthorized
 */
router.post('/refresh', authMiddleware, async (req: Request, res: Response) => {
  try {
    await dynamicConfigService.refreshCache();
    res.json({ success: true, message: 'Configuration cache refreshed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

/**
 * @openapi
 * /config/{key}:
 *   put:
 *     tags: [Config]
 *     summary: Update or create a configuration value (admin)
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: {}
 *               type:
 *                 type: string
 *                 enum: [string, number, boolean, json]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configuration updated
 *       400:
 *         description: Value is required
 *       401:
 *         description: Unauthorized
 */
router.put('/:key', authMiddleware, async (req: Request, res: Response) => {
  const { key } = req.params;
  const { value, type, description } = req.body;

  if (value === undefined) {
    return res.status(400).json({ success: false, message: 'Value is required' });
  }

  try {
    await dynamicConfigService.set(key, value, type as ConfigType, description);
    res.json({ success: true, message: `Configuration "${key}" updated successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

export default router;
