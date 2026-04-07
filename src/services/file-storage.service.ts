import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

const hasS3Config =
  Boolean(env.AWS_REGION) &&
  Boolean(env.AWS_ACCESS_KEY_ID) &&
  Boolean(env.AWS_SECRET_ACCESS_KEY) &&
  Boolean(env.AWS_S3_BUCKET);

const s3Endpoint = env.AWS_S3_ENDPOINT.trim() || undefined;

const s3Client = hasS3Config
  ? new S3Client({
      region: env.AWS_REGION,
      ...(s3Endpoint ? { endpoint: s3Endpoint } : {}),
      forcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
      }
    })
  : null;

const normalizeFilename = (filename: string): string =>
  filename.replace(/[^a-zA-Z0-9._-]/g, '_');

const assertTenantScopedKey = (key: string, tenantId: string): void => {
  const tenantPrefix = `uploads/${tenantId}/`;
  if (!key.startsWith(tenantPrefix)) {
    throw new ApiError(403, 'Access denied for this file');
  }
};

const normalizeObjectKey = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const url = new URL(trimmed);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  }

  return trimmed.replace(/^\/+/, '');
};

const assertS3Configured = (): S3Client => {
  if (!s3Client) {
    throw new ApiError(500, 'S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.');
  }

  return s3Client;
};

type UploadFileToS3Input = {
  buffer: Buffer;
  mimetype: string;
  originalName: string;
  tenantId: string;
  userId: string;
};

const resolveMimeType = (mimetype: string): string => {
  const trimmed = mimetype.trim();
  return trimmed || 'application/octet-stream';
};

export const uploadFileToS3 = async ({
  buffer,
  mimetype,
  originalName,
  tenantId,
  userId
}: UploadFileToS3Input): Promise<{ url: string; key: string; mimeType: string }> => {
  const client = assertS3Configured();

  const safeName = normalizeFilename(originalName);
  const key = `uploads/${tenantId}/${userId}/${Date.now()}-${safeName}`;
  const mimeType = resolveMimeType(mimetype);

  await client.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType
    })
  );

  const url = await getSignedFileUrl(key);

  return {
    key,
    url,
    mimeType
  };
};

export const getSignedFileUrl = async (key: string, tenantId?: string): Promise<string> => {
  const client = assertS3Configured();
  const normalizedKey = normalizeObjectKey(key);
  if (tenantId) {
    assertTenantScopedKey(normalizedKey, tenantId);
  }
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: normalizedKey
  });

  return getSignedUrl(client, command, {
    expiresIn: env.AWS_S3_SIGNED_URL_TTL_SECONDS
  });
};
