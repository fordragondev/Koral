// app/api/auth/[...nextauth]/route.ts — Auth.js v5 App Router handler
//
// Pitfall 8: use the v5 named-export pattern, NOT the v4 default export pattern.
// All customization belongs in server/auth/config.ts — zero logic here.

import { handlers } from '@/server/auth/config';
export const { GET, POST } = handlers;
