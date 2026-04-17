const fs = require('fs');
const path = require('path');
const { Prisma } = require('@prisma/client');

// Basic mapping from Prisma types to OpenAPI types
const typeMap = {
  String: { type: 'string' },
  Boolean: { type: 'boolean' },
  Int: { type: 'integer' },
  BigInt: { type: 'integer' },
  Float: { type: 'number', format: 'float' },
  Decimal: { type: 'number', format: 'double' },
  DateTime: { type: 'string', format: 'date-time' },
  Json: { type: 'object' },
  Bytes: { type: 'string', format: 'byte' }
};

function generateSwaggerDoc() {
  const models = Prisma.dmmf.datamodel.models;
  
  const swagger = {
    openapi: '3.0.0',
    info: {
      title: 'Prisma CRUD API',
      version: '1.0.0',
      description: 'Automatically generated OpenAPI spec for Prisma tables'
    },
    paths: {},
    components: {
      schemas: {}
    }
  };

  models.forEach(model => {
    // Generate Schema definition
    const modelProperties = {};
    const requiredProps = [];

    model.fields.forEach(field => {
      // Ignore relations for simple schemas
      if (field.kind === 'object') return;

      const propSchema = field.type in typeMap 
        ? { ...typeMap[field.type] }
        : { type: 'string' };

      // Append Prisma specific formats
      if (field.isId && field.type === 'String') {
        propSchema.format = 'uuid';
      }

      modelProperties[field.name] = propSchema;
      
      if (field.isRequired && !field.hasDefaultValue) {
        requiredProps.push(field.name);
      }
    });

    swagger.components.schemas[model.name] = {
      type: 'object',
      properties: modelProperties,
      ...(requiredProps.length > 0 && { required: requiredProps })
    };

    // The router path uses lowerCamelCase string length as it is registered in the router.
    // e.g. SupplyLink -> supplyLink
    const routePrefix = model.name.charAt(0).toLowerCase() + model.name.slice(1);

    // Create Path operations
    const basePath = `/api/${routePrefix}`;
    const idPath = `/api/${routePrefix}/{id}`;

    swagger.paths[basePath] = {
      get: {
        summary: `Get all ${model.name} records`,
        tags: [model.name],
        responses: {
          '200': {
            description: 'Success',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: `#/components/schemas/${model.name}` } } } }
          }
        }
      },
      post: {
        summary: `Create a new ${model.name}`,
        tags: [model.name],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${model.name}` } } }
        },
        responses: { '201': { description: 'Created' } }
      }
    };

    swagger.paths[idPath] = {
      get: {
        summary: `Get ${model.name} by ID`,
        tags: [model.name],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Success', content: { 'application/json': { schema: { $ref: `#/components/schemas/${model.name}` } } } } }
      },
      put: {
        summary: `Update ${model.name}`,
        tags: [model.name],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: `#/components/schemas/${model.name}` } } }
        },
        responses: { '200': { description: 'Updated' } }
      },
      delete: {
        summary: `Delete ${model.name}`,
        tags: [model.name],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Deleted' } }
      }
    };
  });

  const outPath = path.resolve(__dirname, '../swagger.json');
  fs.writeFileSync(outPath, JSON.stringify(swagger, null, 2), 'utf8');
  console.log('Swagger documentation generated successfully at:', outPath);
}

generateSwaggerDoc();
