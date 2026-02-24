import { NextFunction, Request, Response } from 'express';
import * as chatService from './chat.service';
import { ApiError } from '../../utils/api-error';

const getAuthContext = (req: Request) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized');
  }

  return req.user;
};

export const getConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const conversations = await chatService.getConversations({
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role
    });

    res.status(200).json({ data: conversations });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const { id } = req.params;
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };

    const result = await chatService.getMessages({
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role,
      conversationId: id,
      page,
      pageSize
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const conversation = await chatService.createConversation({
      tenantId: user.tenantId,
      creatorId: user.id,
      participantIds: req.body.participantIds
    });

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'file is required');
    }

    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
};
