import { NextFunction, Request, Response } from 'express';
import * as chatService from './chat.service';
import { ApiError } from '../../utils/api-error';
import { uploadFileToS3 } from '../../services/file-storage.service';

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
      userId: user.id
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
      conversationId: id,
      page,
      pageSize
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const { id } = req.params;

    const result = await chatService.deleteConversation(
      { tenantId: user.tenantId, userId: user.id },
      id
    );

    res.status(200).json({ data: result });
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

export const createDirectConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const conversation = await chatService.createOrGetDirectConversation({
      tenantId: user.tenantId,
      userId: user.id,
      targetUserId: req.body.userId
    });

    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
};

export const createGroupConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const conversation = await chatService.createGroupConversation({
      tenantId: user.tenantId,
      userId: user.id,
      title: req.body.title,
      participantIds: req.body.participantIds
    });

    res.status(201).json(conversation);
  } catch (error) {
    next(error);
  }
};

export const addReaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const { messageId } = req.params;
    const { emoji } = req.body as { emoji: string };

    const result = await chatService.addReaction({
      tenantId: user.tenantId,
      userId: user.id,
      messageId,
      emoji
    });

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const removeReaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);
    const { messageId } = req.params;
    const { emoji } = req.query as { emoji: string };

    const result = await chatService.removeReaction({
      tenantId: user.tenantId,
      userId: user.id,
      messageId,
      emoji
    });

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const uploadConversationMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = getAuthContext(req);

    if (!req.file) {
      throw new ApiError(400, 'file is required (field name: file)');
    }

    const { id: conversationId } = req.params;
    const body = req.body as { replyToMessageId?: string };

    const message = await chatService.uploadAndSendAssetMessage({
      tenantId: user.tenantId,
      userId: user.id,
      conversationId,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      replyToMessageId: body.replyToMessageId
    });

    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = getAuthContext(req);

    if (!req.file) {
      throw new ApiError(400, 'file is required');
    }

    const uploadResult = await uploadFileToS3({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
      tenantId: user.tenantId,
      userId: user.id
    });

    res.status(201).json({
      url: uploadResult.url,
      key: uploadResult.key,
      mimeType: uploadResult.mimeType,
      mimetype: uploadResult.mimeType,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
};
