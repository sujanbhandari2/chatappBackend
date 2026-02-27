import { logger } from '../config/logger';

interface PushEvent {
  tenantId: string;
  recipientUserIds: string[];
  conversationId: string;
  messagePreview: string;
}

type PushSkipReason = 'NO_RECIPIENTS' | 'NO_PUSH_TOKEN_STORE';

export interface PushDispatchResult {
  ok: boolean;
  enabled: boolean;
  recipientUserCount: number;
  registeredTokenCount: number;
  attempted: number;
  sent: number;
  failed: number;
  skippedReason?: PushSkipReason;
  errors?: string[];
}

export const triggerPushNotification = async (event: PushEvent): Promise<PushDispatchResult> => {
  if (!event.recipientUserIds.length) {
    return {
      ok: false,
      enabled: false,
      recipientUserCount: 0,
      registeredTokenCount: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: 'NO_RECIPIENTS'
    };
  }

  logger.info('Push skipped: user push token storage removed from schema.', {
    tenantId: event.tenantId,
    conversationId: event.conversationId,
    recipientUserCount: event.recipientUserIds.length
  });

  return {
    ok: false,
    enabled: false,
    recipientUserCount: event.recipientUserIds.length,
    registeredTokenCount: 0,
    attempted: 0,
    sent: 0,
    failed: 0,
    skippedReason: 'NO_PUSH_TOKEN_STORE'
  };
};

export const triggerMockPushNotification = triggerPushNotification;
