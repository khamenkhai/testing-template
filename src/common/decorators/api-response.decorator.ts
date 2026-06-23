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
