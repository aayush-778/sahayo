'use client';

import { useEffect } from 'react';
import { joinAdminRoom } from '@/lib/services';
import { FundFinale } from './FundFinale';

/**
 * Joins the portal to the backend's admin room for as long as the shell is on screen,
 * and hosts what live events put in front of the administrator wherever they are.
 * With no backend running it does nothing visible, and the portal runs on its seed.
 */
export function LiveBridge() {
  useEffect(() => joinAdminRoom(), []);
  return <FundFinale />;
}
