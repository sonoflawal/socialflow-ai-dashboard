import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createWebhookSchema, updateWebhookSchema, testWebhookSchema } from '../schemas/webhooks';
import { verifySignature, rawBodyMiddleware } from '../middleware/verifySignature';
import { prisma } from '../lib/prisma';
import { createLogger } from '../lib/logger';
import {
  listWebhooks,
  createWebhook,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  listDeliveries,
  replayDelivery,
} from '../controllers/webhooks';

const logger = createLogger('webhook-routes');

const router = Router();

// Rate limiting: 60 requests/min per IP for general endpoints, stricter for test/replay
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
const actionLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// All webhook routes require authentication
router.use(authMiddleware);
router.use(generalLimiter);

router.get('/', listWebhooks);
router.post('/', validate(createWebhookSchema), createWebhook);
router.get('/:id', getWebhook);
router.patch('/:id', validate(updateWebhookSchema), updateWebhook);
router.delete('/:id', deleteWebhook);
router.post('/:id/test', actionLimiter, validate(testWebhookSchema), testWebhook);
router.get('/:id/deliveries', listDeliveries);
router.post('/:id/deliveries/:deliveryId/replay', actionLimiter, replayDelivery);

// ── Inbound webhook listener ──────────────────────────────────────────────────
// Receives signed payloads from third-party services.
// No auth middleware — authenticated via HMAC signature instead.
// The subscription's hashed secret is looked up by :id.
router.post(
  '/:id/incoming',
  rawBodyMiddleware,
  verifySignature({
    // Look up the subscription's stored secret by the webhook ID in the URL
    getSecret: async (req) => {
      const sub = await prisma.webhookSubscription.findUnique({
        where: { id: req.params.id },
        select: { secret: true },
      });
      return sub?.secret ?? null;
    },
  }),
  (req, res) => {
    logger.info('Inbound webhook received', {
      subscriptionId: req.params.id,
      path: req.path,
    });
    // Consumers can extend this handler to process the verified payload
    res.status(200).json({ received: true });
  },
);

export default router;
