import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto, PaginationMetaDto } from '../dto/response.dto';

const getSingleResponseSchema = (model: Type<unknown>) => ({
  allOf: [
    { $ref: getSchemaPath(ApiResponseDto) },
    {
      type: 'object',
      properties: {
        data: { $ref: getSchemaPath(model) },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-07-06T08:30:00.000Z',
        },
        path: {
          type: 'string',
          example: '/api/v1/admin/roles/019f35b7-91c8-7368-a45c-a6c794e11e1d',
        },
      },
    },
  ],
});

const getListResponseSchema = (model: Type<unknown>) => ({
  allOf: [
    { $ref: getSchemaPath(ApiResponseDto) },
    {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(model) },
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-07-06T08:30:00.000Z',
        },
        path: {
          type: 'string',
          example: '/api/v1/admin/roles',
        },
      },
    },
  ],
});

const getPaginatedResponseSchema = (model: Type<unknown>) => ({
  allOf: [
    { $ref: getSchemaPath(ApiResponseDto) },
    {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(model) },
        },
        meta: { $ref: getSchemaPath(PaginationMetaDto) },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2026-07-06T08:30:00.000Z',
        },
        path: {
          type: 'string',
          example: '/api/v1/admin/roles?page=1&limit=20',
        },
      },
    },
  ],
});

export const ApiSwaggerSingleResponse = <TModel extends Type<unknown>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiOkResponse({
      description: 'Successfully retrieved single record.',
      schema: getSingleResponseSchema(model),
    }),
  );
};

export const ApiSwaggerListResponse = <TModel extends Type<unknown>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, model),
    ApiOkResponse({
      description: 'Successfully retrieved list of records.',
      schema: getListResponseSchema(model),
    }),
  );
};

export const ApiSwaggerPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(ApiResponseDto, PaginationMetaDto, model),
    ApiOkResponse({
      description: 'Successfully retrieved paginated records.',
      schema: getPaginatedResponseSchema(model),
    }),
  );
};
