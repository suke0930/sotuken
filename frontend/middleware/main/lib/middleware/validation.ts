/**
 * Validation Middleware and Schemas
 *
 * 再利用可能なバリデーションミドルウェアとスキーマ
 */

import express from 'express';
import { z } from 'zod';
import type { ServerManager } from '../minecraft-server-manager/src/classes/ServerManager';
import { ERROR_CODES, ERROR_MESSAGES } from '../constants/api-messages';
import { createErrorResponse } from '../types/api-responses';

/**
 * サーバーIDパラメータのバリデーション
 */
export class ApiValidationMiddleware {
  /**
   * サーバーIDが存在するかチェック
   */
  static validateServerId(): express.RequestHandler {
    return (req, res, next) => {
      if (!req.params.id) {
        return res.status(400).json(
          createErrorResponse(
            ERROR_CODES.MISSING_SERVER_ID,
            ERROR_MESSAGES.MISSING_SERVER_ID
          )
        );
      }
      next();
    };
  }

  /**
   * サーバーインスタンスが存在するかチェック
   *
   * @param serverManager - ServerManagerインスタンス
   */
  static validateServerExists(serverManager: ServerManager): express.RequestHandler {
    return (req, res, next) => {
      const instance = serverManager.getInstanceData(req.params.id!);
      if (!instance) {
        return res.status(404).json(
          createErrorResponse(
            ERROR_CODES.INSTANCE_NOT_FOUND,
            ERROR_MESSAGES.INSTANCE_NOT_FOUND
          )
        );
      }
      // インスタンスをリクエストに添付（ハンドラーで再取得を避けるため）
      (req as any).serverInstance = instance;
      next();
    };
  }
}

/**
 * サーバープロパティ更新のバリデーションスキーマ
 */
export const ServerPropertiesUpdateSchema = z.object({
  data: z
    .record(
      z.string().min(1, 'プロパティのキーは1文字以上である必要があります').max(255, 'プロパティのキーは255文字以下である必要があります'),
      z.string().max(1000, 'プロパティの値は1000文字以下である必要があります')
    )
    .refine((obj) => Object.keys(obj).length > 0, {
      message: ERROR_MESSAGES.EMPTY_UPDATE_DATA
    })
    .refine((obj) => Object.keys(obj).length <= 100, {
      message: ERROR_MESSAGES.TOO_MANY_PROPERTIES
    })
});

/**
 * Zodスキーマによるリクエストボディのバリデーション
 *
 * @param schema - Zodスキーマ
 */
export function validateRequestBody<T extends z.ZodTypeAny>(
  schema: T
): express.RequestHandler {
  return (req, res, next) => {
    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json(
        createErrorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          ERROR_MESSAGES.VALIDATION_ERROR,
          validation.error.issues
        )
      );
    }

    // バリデーション済みのデータをリクエストに添付
    (req as any).validatedBody = validation.data;
    next();
  };
}
