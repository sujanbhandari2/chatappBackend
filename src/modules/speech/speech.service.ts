import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';

const readJsonSafe = async (res: Response): Promise<unknown> => {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const upstreamError = (res: Response, body: unknown): ApiError => {
  const msg =
    typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as { error?: { message?: string } }).error?.message === 'string'
      ? (body as { error: { message: string } }).error.message
      : typeof body === 'string'
        ? body
        : `Upstream request failed (${res.status})`;
  return new ApiError(res.status >= 400 && res.status < 600 ? res.status : 502, msg, body);
};

export const sha256Buffer = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

export const normalizeTranscriptionLanguageKey = (language?: string): string => {
  if (typeof language !== 'string') return '';
  const t = language.trim().toLowerCase();
  return t.length > 16 ? t.slice(0, 16) : t;
};

const transcribeViaUpstream = async (input: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}): Promise<{ text: string }> => {
  if (!env.OPENAI_API_KEY) {
    throw new ApiError(503, 'Transcription is not configured (OPENAI_API_KEY is missing)');
  }

  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('file', new Blob([input.buffer], { type: input.mimeType }), input.filename);
  if (input.language) {
    form.append('language', input.language);
  }

  const res = await fetch(env.OPENAI_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: form
  });

  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw upstreamError(res, data);
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'text' in data &&
    typeof (data as { text: unknown }).text === 'string'
  ) {
    return { text: (data as { text: string }).text };
  }

  throw new ApiError(502, 'Unexpected transcription response');
};

export type TranscribeWithCacheResult = { text: string; fromCache: boolean };

export const transcribeAudio = async (input: {
  tenantId: string;
  userId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
  processAgain: boolean;
}): Promise<TranscribeWithCacheResult> => {
  const languageKey = normalizeTranscriptionLanguageKey(input.language);
  const audioContentSha256 = sha256Buffer(input.buffer);

  if (!input.processAgain) {
    const rows = await prisma.$queryRaw<Array<{ transcript_text: string }>>(
      Prisma.sql`
        SELECT transcript_text
        FROM audio_transcriptions
        WHERE tenant_id = ${input.tenantId}
          AND user_id = ${input.userId}
          AND audio_content_sha256 = ${audioContentSha256}
          AND language = ${languageKey}
        LIMIT 1
      `
    );

    const cached = rows[0];
    if (cached) {
      return { text: cached.transcript_text, fromCache: true };
    }
  }

  const { text } = await transcribeViaUpstream({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
    language: input.language
  });

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO audio_transcriptions (
        id,
        tenant_id,
        user_id,
        audio_content_sha256,
        language,
        transcript_text,
        created_at,
        updated_at
      )
      VALUES (
        ${randomUUID()},
        ${input.tenantId},
        ${input.userId},
        ${audioContentSha256},
        ${languageKey},
        ${text},
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, user_id, audio_content_sha256, language)
      DO UPDATE SET
        transcript_text = EXCLUDED.transcript_text,
        updated_at = NOW()
    `
  );

  return { text, fromCache: false };
};

const translateWithOpenAI = async (input: {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}): Promise<string> => {
  if (!env.OPENAI_API_KEY) {
    throw new ApiError(503, 'OpenAI translation is not configured (OPENAI_API_KEY is missing)');
  }

  const userPrompt = input.sourceLanguage
    ? `Translate from ${input.sourceLanguage} to ${input.targetLanguage}. Output only the translated text, no quotes or notes:\n\n${input.text}`
    : `Translate to ${input.targetLanguage}. Output only the translated text, no quotes or notes:\n\n${input.text}`;

  const res = await fetch(env.OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_TRANSLATION_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a translation engine. Reply with only the translated text in the target language. No preamble or markdown.'
        },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw upstreamError(res, data);
  }

  const content =
    typeof data === 'object' &&
    data !== null &&
    'choices' in data &&
    Array.isArray((data as { choices: unknown }).choices) &&
    (data as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  throw new ApiError(502, 'Unexpected OpenAI chat response');
};

const translateWithGemini = async (input: {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}): Promise<string> => {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(503, 'Gemini translation is not configured (GEMINI_API_KEY is missing)');
  }

  const prompt = input.sourceLanguage
    ? `Translate the following from ${input.sourceLanguage} to ${input.targetLanguage}. Output only the translated text:\n\n${input.text}`
    : `Translate the following to ${input.targetLanguage}. Output only the translated text:\n\n${input.text}`;

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_TRANSLATION_MODEL)}:generateContent`
  );
  url.searchParams.set('key', env.GEMINI_API_KEY);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  const data = await readJsonSafe(res);
  if (!res.ok) {
    throw upstreamError(res, data);
  }

  const parts =
    typeof data === 'object' &&
    data !== null &&
    'candidates' in data &&
    Array.isArray((data as { candidates: unknown }).candidates) &&
    (data as { candidates: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates[0]
      ?.content?.parts;

  const text =
    Array.isArray(parts) && typeof parts[0]?.text === 'string' ? parts[0].text.trim() : '';

  if (text) {
    return text;
  }

  throw new ApiError(502, 'Unexpected Gemini response');
};

export const translateText = async (input: {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}): Promise<{ translatedText: string }> => {
  if (env.TRANSLATION_PROVIDER === 'gemini') {
    const translatedText = await translateWithGemini(input);
    return { translatedText };
  }

  const translatedText = await translateWithOpenAI(input);
  return { translatedText };
};
