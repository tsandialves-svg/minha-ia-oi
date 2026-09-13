import { z } from 'zod';
export const chatInput = z.object({ conversationId:z.string().uuid().optional(), message:z.string().trim().min(1).max(6000) });
export const planInput = z.object({ plan:z.enum(['monthly','yearly']) });
