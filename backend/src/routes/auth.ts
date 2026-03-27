import { Router } from 'express';
import { register, login, refresh, logout, changePassword } from '../controllers/auth';
import { validate } from '../middleware/validate';
import { credentialsSchema, refreshTokenSchema, changePasswordSchema } from '../schemas/auth';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/register', validate(credentialsSchema), register);
router.post('/login', validate(credentialsSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', validate(refreshTokenSchema), logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;
