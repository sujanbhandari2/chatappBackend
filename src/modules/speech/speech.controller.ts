import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../../utils/api-error';
import * as speechService from './speech.service';
import { TranslateBody } from './speech.schemas';

const getAuthContext = (req: Request) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }
  return req.user;
};

const parseTruthyFlag = (v: unknown): boolean => {
  if (v === true) return true;
  if (v === false || v === undefined || v === null) return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
};

export const transcribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);

    if (!req.file) {
      throw new ApiError(400, 'audio file is required (field name: audio)');
    }

    const language =
      typeof req.body?.language === 'string' && req.body.language.length >= 2
        ? req.body.language
        : undefined;

    const processAgain =
      parseTruthyFlag(req.body?.processAgain) || parseTruthyFlag(req.query?.processAgain);

    const result = await speechService.transcribeAudio({
      tenantId: user.tenantId,
      userId: user.id,
      buffer: req.file.buffer,
      filename: req.file.originalname || 'audio',
      mimeType: req.file.mimetype || 'application/octet-stream',
      language,
      processAgain
    });

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const translate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    getAuthContext(req);
    const body = req.body as TranslateBody;

    const result = await speechService.translateText({
      text: body.text,
      targetLanguage: body.targetLanguage,
      sourceLanguage: body.sourceLanguage
    });

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};
