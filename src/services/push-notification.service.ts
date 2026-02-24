import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface PushEvent {
  tenantId: string;
  recipientUserIds: string[];
  conversationId: string;
  messagePreview: string;
}

type PushSkipReason =
  | 'NO_RECIPIENTS'
  | 'FCM_DISABLED'
  | 'ACCESS_TOKEN_ERROR'
  | 'NO_REGISTERED_TOKENS';

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

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

const OAUTH_AUDIENCE = 'https://oauth2.googleapis.com/token';
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const ANDROID_CHANNEL_ID = 'healthchat_messages';

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

const firebaseConfig = {
  projectId: env.FIREBASE_PROJECT_ID,
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

const isPushEnabled = (): boolean => {
  return Boolean(firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey);
};

const isTokenRegistrationError = (rawError: unknown): boolean => {
  const message = JSON.stringify(rawError).toUpperCase();
  return (
    message.includes('UNREGISTERED') ||
    message.includes('REGISTRATION-TOKEN-NOT-REGISTERED') ||
    message.includes('INVALID_ARGUMENT')
  );
};

const fetchAccessToken = async (): Promise<string | null> => {
  if (!isPushEnabled()) {
    return null;
  }

  if (cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const assertion = jwt.sign(
    {
      iss: firebaseConfig.clientEmail,
      sub: firebaseConfig.clientEmail,
      aud: OAUTH_AUDIENCE,
      scope: OAUTH_SCOPE
    },
    firebaseConfig.privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '1h'
    }
  );

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch(OAUTH_AUDIENCE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const payload = (await response.json()) as GoogleTokenResponse | { error?: unknown };

  if (!response.ok || !('access_token' in payload)) {
    logger.error('Failed to obtain Firebase access token', { payload });
    return null;
  }

  cachedAccessToken = {
    token: payload.access_token,
    expiresAtMs: Date.now() + payload.expires_in * 1000
  };

  return cachedAccessToken.token;
};

const sendToSingleDevice = async (
  accessToken: string,
  deviceToken: string,
  event: PushEvent
): Promise<void> => {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${firebaseConfig.projectId}/messages:send`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: {
          title: 'Healthcare Messenger',
          body: event.messagePreview
        },
        data: {
          type: 'chat_message',
          tenantId: event.tenantId,
          conversationId: event.conversationId
        },
        android: {
          priority: 'high',
          notification: {
            channel_id: ANDROID_CHANNEL_ID,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'default'
          }
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert'
          },
          payload: {
            aps: {
              sound: 'default',
              'content-available': 1,
              'mutable-content': 1
            }
          }
        }
      }
    })
  });

  if (response.ok) {
    return;
  }

  const errorPayload = await response.json().catch(() => ({ message: 'Unknown push error' }));

  if (isTokenRegistrationError(errorPayload)) {
    await prisma.userPushToken.deleteMany({
      where: {
        token: deviceToken
      }
    });
  }

  throw new Error(`Push failed (${response.status}): ${JSON.stringify(errorPayload)}`);
};

export const triggerPushNotification = async (event: PushEvent): Promise<PushDispatchResult> => {
  if (!event.recipientUserIds.length) {
    return {
      ok: false,
      enabled: isPushEnabled(),
      recipientUserCount: 0,
      registeredTokenCount: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: 'NO_RECIPIENTS'
    };
  }

  if (!isPushEnabled()) {
    logger.info('Push skipped. Firebase env vars are missing.', {
      tenantId: event.tenantId,
      conversationId: event.conversationId
    });
    return {
      ok: false,
      enabled: false,
      recipientUserCount: event.recipientUserIds.length,
      registeredTokenCount: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: 'FCM_DISABLED'
    };
  }

  const accessToken = await fetchAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      enabled: true,
      recipientUserCount: event.recipientUserIds.length,
      registeredTokenCount: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: 'ACCESS_TOKEN_ERROR'
    };
  }

  const tokens = await prisma.userPushToken.findMany({
    where: {
      tenantId: event.tenantId,
      userId: {
        in: event.recipientUserIds
      }
    },
    select: {
      token: true
    }
  });

  const uniqueTokens = Array.from(new Set(tokens.map((entry) => entry.token)));
  if (!uniqueTokens.length) {
    logger.info('Push skipped. No registered device tokens for recipients.', {
      tenantId: event.tenantId,
      conversationId: event.conversationId,
      recipientUserCount: event.recipientUserIds.length
    });
    return {
      ok: false,
      enabled: true,
      recipientUserCount: event.recipientUserIds.length,
      registeredTokenCount: 0,
      attempted: 0,
      sent: 0,
      failed: 0,
      skippedReason: 'NO_REGISTERED_TOKENS'
    };
  }

  const results = await Promise.allSettled(
    uniqueTokens.map((token) => sendToSingleDevice(accessToken, token, event))
  );

  const failures = results.filter((result) => result.status === 'rejected').length;
  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => {
      const reason = result.reason;
      return reason instanceof Error ? reason.message : String(reason);
    });

  const sent = uniqueTokens.length - failures;

  if (failures > 0) {
    logger.warn('Push send completed with failures', {
      tenantId: event.tenantId,
      conversationId: event.conversationId,
      attempted: uniqueTokens.length,
      failed: failures
    });
  }

  return {
    ok: failures === 0,
    enabled: true,
    recipientUserCount: event.recipientUserIds.length,
    registeredTokenCount: uniqueTokens.length,
    attempted: uniqueTokens.length,
    sent,
    failed: failures,
    errors: errors.length ? errors : undefined
  };
};

// Backward-compatible export used in existing modules.
export const triggerMockPushNotification = triggerPushNotification;
