import { Temporal } from "temporal-polyfill";

import * as anytype from "./anytype-openapi";
import type * as anyTypes from "./anytype-openapi";
export type * from "./anytype-openapi";

import { RateLimiter } from "./ratelimit";
import * as errors from "./errors";
import { createProperties, parseProperties, type PropertiesObject, type Filter, type FilterCondition, convertFilter } from "./builders";

export { errors, createProperties, parseProperties, type PropertiesObject, type Filter, type FilterCondition };

export const anytypeVersion = "2025-05-20";

const mkClient = (key: string) => {
  const headers = {
    "Anytype-Version": anytypeVersion,
    Authorization: `Bearer ${key}`,
  };

  const rateLimiter = new RateLimiter();

  const throwApiError = (data: any): never => {
    if (!data) throw new errors.AnytypeError("Unknown error", "unknown", 0);
    switch (data.code) {
      case "bad_request": throw new errors.BadRequestError(data.message);
      case "unauthorized": throw new errors.UnauthorizedError(data.message);
      case "forbidden": throw new errors.ForbiddenError(data.message);
      case "resource_gone": throw new errors.GoneError(data.message);
      case "rate_limit_exceeded": throw new errors.RateLimitError(data.message);
      case "internal_server_error": throw new errors.ServerError(data.message);
      default: throw new errors.AnytypeError(data.message, data.code, data.status);
    }
  };

  async function* paginateAnytype<Item>(
    fetchPage: (
      offset: number | undefined,
      limit: number | undefined
    ) => Promise<{
      data: {
        data?: Item[] | null | undefined;
        pagination?: {
          total?: number;
          offset?: number;
          limit?: number;
          has_more?: boolean;
        };
      };
      request: Request;
      response: Response;
    }>,
    opts: { offset?: number; limit?: number } = {}
  ): AsyncGenerator<Item, void, void> {
    let offset = opts.offset;
    const limit = opts.limit;

    while (true) {
      const response = await fetchPage(offset, limit);

      const items = response.data.data ?? [];

      if (!Array.isArray(items)) break;

      for (const item of items) {
        yield item;
      }

      const pagination = response.data.pagination;
      if (!pagination?.has_more || items.length === 0) break;

      if (pagination.offset !== undefined && pagination.limit !== undefined) {
        offset = pagination.offset + pagination.limit;
      } else {
        break;
      }
    }
  }

  const searchSpace = async function* (
    spaceId: string,
    params: {
      query?: string;
      types?: string[];
      sort?: anyTypes.SortOptions;
      filters?: Filter;
      limit?: number;
      offset?: number;
    }
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: PropertiesObject;
    },
    void,
    void
  > {
    const { offset, limit, filters, ...baseParams } = params;
    
    const body = {
      ...baseParams,
      filters: filters ? convertFilter(filters) : undefined,
    };

    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.searchSpace({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
        body,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield {
        ...item,
        propertiesRaw: item.properties,
        properties: parseProperties(item.properties),
      };
    }
  };

  const getObject = async (path: anytype.GetObjectData["path"]) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getObject({
        headers,
        path,
        query: { format: "md" },
      });
      if (!response.data?.object) return undefined;
      const object = response.data.object;
      return {
        ...object,
        propertiesRaw: object.properties,
        properties: parseProperties(object.properties),
      };
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const createChallenge = async (appName: string) => {
    await rateLimiter.acquire();
    const response = await anytype.createAuthChallenge({
      headers,
      body: { app_name: appName },
      throwOnError: true,
    });
    return response.data;
  };

  const createApiKey = async (challengeId: string, code: string) => {
    await rateLimiter.acquire();
    const response = await anytype.createApiKey({
      headers,
      body: { challenge_id: challengeId, code },
      throwOnError: true,
    });
    return response.data;
  };

  const searchGlobal = async function* (
    params: {
      query?: string;
      types?: string[];
      sort?: anyTypes.SortOptions;
      filters?: Filter;
      limit?: number;
      offset?: number;
    }
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: PropertiesObject;
    },
    void,
    void
  > {
    const { offset, limit, filters, ...baseParams } = params;
    
    const body = {
      ...baseParams,
      filters: filters ? convertFilter(filters) : undefined,
    };

    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.searchGlobal({
        headers,
        throwOnError: true,
        body,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield {
        ...item,
        propertiesRaw: item.properties,
        properties: parseProperties(item.properties),
      };
    }
  };

  const listSpaces = async function* (
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Space, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listSpaces({
        headers,
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const createSpace = async (name: string, description?: string) => {
    await rateLimiter.acquire();
    const response = await anytype.createSpace({
      headers,
      body: { name, description },
      throwOnError: true,
    });
    return response.data;
  };

  const getSpace = async (spaceId: string) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getSpace({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const updateSpace = async (
    spaceId: string,
    name?: string,
    description?: string
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.updateSpace({
      headers,
      path: { space_id: spaceId },
      body: { name, description },
      throwOnError: true,
    });
    return response.data;
  };

  const listObjects = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: PropertiesObject;
    },
    void,
    void
  > {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listObjects({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield {
        ...item,
        propertiesRaw: item.properties,
        properties: parseProperties(item.properties),
      };
    }
  };

  const createObject = async (
    spaceId: string,
    typeKey: string,
    params: {
      name?: string;
      body?: string;
      icon?: anyTypes.Icon;
      templateId?: string;
      properties?: PropertiesObject;
    } = {}
  ) => {
    await rateLimiter.acquire();
    const { name, body, icon, templateId, properties } = params;
    const response = await anytype.createObject({
      headers,
      path: { space_id: spaceId },
      body: {
        type_key: typeKey,
        name,
        body,
        icon,
        template_id: templateId,
        properties: properties ? createProperties(properties) : undefined,
      },
      throwOnError: true,
    });
    if (!response.data?.object) return undefined;
    const object = response.data.object;
    return {
      ...object,
      propertiesRaw: object.properties,
      properties: parseProperties(object.properties),
    };
  };

  const updateObject = async (
    spaceId: string,
    objectId: string,
    params: {
      name?: string;
      icon?: anyTypes.Icon;
      properties?: PropertiesObject;
    } = {}
  ) => {
    await rateLimiter.acquire();
    const { name, icon, properties } = params;
    const response = await anytype.updateObject({
      headers,
      path: { space_id: spaceId, object_id: objectId },
      body: { name, icon, properties: properties ? createProperties(properties) : undefined },
      throwOnError: true,
    });
    if (!response.data?.object) return undefined;
    const object = response.data.object;
    return {
      ...object,
      propertiesRaw: object.properties,
      properties: parseProperties(object.properties),
    };
  };

  const deleteObject = async (spaceId: string, objectId: string) => {
    await rateLimiter.acquire();
    const response = await anytype.deleteObject({
      headers,
      path: { space_id: spaceId, object_id: objectId },
      throwOnError: true,
    });
    return response.data;
  };

  const listTypes = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Type, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listTypes({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const createType = async (
    spaceId: string,
    name: string,
    pluralName: string,
    layout: anyTypes.TypeLayout,
    params: {
      key?: string;
      icon?: anyTypes.Icon;
      properties?: Array<anyTypes.PropertyLink>;
    } = {}
  ) => {
    await rateLimiter.acquire();
    const { key, icon, properties } = params;
    const response = await anytype.createType({
      headers,
      path: { space_id: spaceId },
      body: { name, plural_name: pluralName, layout, key, icon, properties },
      throwOnError: true,
    });
    return response.data;
  };

  const getType = async (spaceId: string, typeId: string) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getType({
        headers,
        path: { space_id: spaceId, type_id: typeId },
        throwOnError: true,
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const updateType = async (
    spaceId: string,
    typeId: string,
    name?: string,
    pluralName?: string,
    layout?: anyTypes.TypeLayout,
    params: {
      key?: string;
      icon?: anyTypes.Icon;
      properties?: Array<anyTypes.PropertyLink>;
    } = {}
  ) => {
    await rateLimiter.acquire();
    const { key, icon, properties } = params;
    const response = await anytype.updateType({
      headers,
      path: { space_id: spaceId, type_id: typeId },
      body: { name, plural_name: pluralName, layout, key, icon, properties },
      throwOnError: true,
    });
    return response.data;
  };

  const deleteType = async (spaceId: string, typeId: string) => {
    await rateLimiter.acquire();
    const response = await anytype.deleteType({
      headers,
      path: { space_id: spaceId, type_id: typeId },
      throwOnError: true,
    });
    return response.data;
  };

  const listProperties = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Property, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listProperties({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const createProperty = async (
    spaceId: string,
    name: string,
    format: anyTypes.PropertyFormat,
    key?: string
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.createProperty({
      headers,
      path: { space_id: spaceId },
      body: { name, format, key },
      throwOnError: true,
    });
    return response.data;
  };

  const getProperty = async (spaceId: string, propertyId: string) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getProperty({
        headers,
        path: { space_id: spaceId, property_id: propertyId },
        throwOnError: true,
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const updateProperty = async (
    spaceId: string,
    propertyId: string,
    name: string,
    key?: string
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.updateProperty({
      headers,
      path: { space_id: spaceId, property_id: propertyId },
      body: { name, key },
      throwOnError: true,
    });
    return response.data;
  };

  const deleteProperty = async (spaceId: string, propertyId: string) => {
    await rateLimiter.acquire();
    const response = await anytype.deleteProperty({
      headers,
      path: { space_id: spaceId, property_id: propertyId },
      throwOnError: true,
    });
    return response.data;
  };

  const listTemplates = async function* (
    spaceId: string,
    typeId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Object, void, void> {
    const { offset, limit } = params;
    const query = offset !== undefined || limit !== undefined 
      ? { offset, limit } 
      : undefined;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listTemplates({
        headers,
        path: { space_id: spaceId, type_id: typeId },
        throwOnError: true,
        query,
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const getTemplate = async (
    spaceId: string,
    typeId: string,
    templateId: string
  ) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getTemplate({
        headers,
        path: { space_id: spaceId, type_id: typeId, template_id: templateId },
        throwOnError: true,
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const addObjectsToList = async (
    spaceId: string,
    listId: string,
    objects: string[]
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.addListObjects({
      headers,
      path: { space_id: spaceId, list_id: listId },
      body: { objects },
      throwOnError: true,
    });
    return response.data;
  };

  const removeObjectFromList = async (
    spaceId: string,
    listId: string,
    objectId: string
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.removeListObject({
      headers,
      path: { space_id: spaceId, list_id: listId, object_id: objectId },
      throwOnError: true,
    });
    return response.data;
  };

  const getListViews = async function* (
    spaceId: string,
    listId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.View, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.getListViews({
        headers,
        path: { space_id: spaceId, list_id: listId },
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const getObjectsInList = async function* (
    spaceId: string,
    listId: string,
    viewId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: PropertiesObject;
    },
    void,
    void
  > {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.getListObjects({
        headers,
        path: { space_id: spaceId, list_id: listId, view_id: viewId },
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield {
        ...item,
        propertiesRaw: item.properties,
        properties: parseProperties(item.properties),
      };
    }
  };

  const listMembers = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Member, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listMembers({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const getMember = async (spaceId: string, memberId: string) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getMember({
        headers,
        path: { space_id: spaceId, member_id: memberId },
        throwOnError: true,
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const listTags = async function* (
    spaceId: string,
    propertyId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Tag, void, void> {
    const fetchPage = (_offset: number | undefined, _limit: number | undefined) =>
      anytype.listTags({
        headers,
        path: { space_id: spaceId, property_id: propertyId },
        throwOnError: true,
      });

    for await (const item of paginateAnytype(fetchPage, params)) {
      yield item;
    }
  };

  const createTag = async (
    spaceId: string,
    propertyId: string,
    name: string,
    color: anyTypes.Color
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.createTag({
      headers,
      path: { space_id: spaceId, property_id: propertyId },
      body: { name, color },
      throwOnError: true,
    });
    return response.data;
  };

  const getTag = async (spaceId: string, propertyId: string, tagId: string) => {
    await rateLimiter.acquire();
    try {
      const response = await anytype.getTag({
        headers,
        path: { space_id: spaceId, property_id: propertyId, tag_id: tagId },
        throwOnError: true,
      });
      return response.data;
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.code === "object_not_found") return undefined;
      throwApiError(data);
    }
  };

  const updateTag = async (
    spaceId: string,
    propertyId: string,
    tagId: string,
    name?: string,
    color?: anyTypes.Color
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.updateTag({
      headers,
      path: { space_id: spaceId, property_id: propertyId, tag_id: tagId },
      body: { name, color },
      throwOnError: true,
    });
    return response.data;
  };

  const deleteTag = async (
    spaceId: string,
    propertyId: string,
    tagId: string
  ) => {
    await rateLimiter.acquire();
    const response = await anytype.deleteTag({
      headers,
      path: { space_id: spaceId, property_id: propertyId, tag_id: tagId },
      throwOnError: true,
    });
    return response.data;
  };

  const space = (spaceId: string) => ({
    getObject: (objectId: string) => getObject({ space_id: spaceId, object_id: objectId }),
    listObjects: (params?: { limit?: number; offset?: number }) => listObjects(spaceId, params),
    createObject: (typeKey: string, params?: Parameters<typeof createObject>[2]) => 
      createObject(spaceId, typeKey, params),
    updateObject: (objectId: string, params?: Parameters<typeof updateObject>[2]) => 
      updateObject(spaceId, objectId, params),
    deleteObject: (objectId: string) => deleteObject(spaceId, objectId),
    search: (params: Parameters<typeof searchSpace>[1]) => searchSpace(spaceId, params),
    getType: (typeId: string) => getType(spaceId, typeId),
    listTypes: (params?: { limit?: number; offset?: number }) => listTypes(spaceId, params),
    createType: (name: string, pluralName: string, layout: anyTypes.TypeLayout, params?: Parameters<typeof createType>[4]) => 
      createType(spaceId, name, pluralName, layout, params),
    updateType: (typeId: string, name?: string, pluralName?: string, layout?: anyTypes.TypeLayout, params?: Parameters<typeof updateType>[5]) => 
      updateType(spaceId, typeId, name, pluralName, layout, params),
    deleteType: (typeId: string) => deleteType(spaceId, typeId),
    getProperty: (propertyId: string) => getProperty(spaceId, propertyId),
    listProperties: (params?: { limit?: number; offset?: number }) => listProperties(spaceId, params),
    createProperty: (name: string, format: anyTypes.PropertyFormat, key?: string) => 
      createProperty(spaceId, name, format, key),
    updateProperty: (propertyId: string, name: string, key?: string) => 
      updateProperty(spaceId, propertyId, name, key),
    deleteProperty: (propertyId: string) => deleteProperty(spaceId, propertyId),
    getTemplate: (typeId: string, templateId: string) => getTemplate(spaceId, typeId, templateId),
    listTemplates: (typeId: string, params?: { limit?: number; offset?: number }) => 
      listTemplates(spaceId, typeId, params ?? {}),
    addObjectsToList: (listId: string, objects: string[]) => addObjectsToList(spaceId, listId, objects),
    removeObjectFromList: (listId: string, objectId: string) => removeObjectFromList(spaceId, listId, objectId),
    getListViews: (listId: string, params?: { limit?: number; offset?: number }) => 
      getListViews(spaceId, listId, params),
    getObjectsInList: (listId: string, viewId: string, params?: { limit?: number; offset?: number }) => 
      getObjectsInList(spaceId, listId, viewId, params),
    getMember: (memberId: string) => getMember(spaceId, memberId),
    listMembers: (params?: { limit?: number; offset?: number }) => listMembers(spaceId, params),
    getTag: (propertyId: string, tagId: string) => getTag(spaceId, propertyId, tagId),
    listTags: (propertyId: string, params?: { limit?: number; offset?: number }) => 
      listTags(spaceId, propertyId, params),
    createTag: (propertyId: string, name: string, color: anyTypes.Color) => 
      createTag(spaceId, propertyId, name, color),
    updateTag: (propertyId: string, tagId: string, name?: string, color?: anyTypes.Color) => 
      updateTag(spaceId, propertyId, tagId, name, color),
    deleteTag: (propertyId: string, tagId: string) => deleteTag(spaceId, propertyId, tagId),
  });

  return {
    searchSpace,
    getObject,
    createChallenge,
    createApiKey,
    searchGlobal,
    listSpaces,
    createSpace,
    getSpace,
    updateSpace,
    listObjects,
    createObject,
    updateObject,
    deleteObject,
    listTypes,
    createType,
    getType,
    updateType,
    deleteType,
    listProperties,
    createProperty,
    getProperty,
    updateProperty,
    deleteProperty,
    listTemplates,
    getTemplate,
    addObjectsToList,
    removeObjectFromList,
    getListViews,
    getObjectsInList,
    listMembers,
    getMember,
    listTags,
    createTag,
    getTag,
    updateTag,
    deleteTag,
    space,
  };
};

export type AnytypeSimplePropertiesObject = Record<string, unknown>;

export const mapPropertiesToSimpleObject = (
  properties: anyTypes.PropertyWithValue[] | null | undefined
): AnytypeSimplePropertiesObject => {
  const props = properties ?? [];
  return Object.fromEntries(
    props
      .filter((p) => Boolean(p.key))
      .map((p) => [p.key, extractPropertyValue(p)])
  );
};

const isTextProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.TextPropertyValue => {
  return prop.format === "text";
};

const isNumberProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.NumberPropertyValue => {
  return prop.format === "number";
};

const isDateProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.DatePropertyValue => {
  return prop.format === "date";
};

const isCheckboxProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.CheckboxPropertyValue => {
  return prop.format === "checkbox";
};

const isSelectProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.SelectPropertyValue => {
  return prop.format === "select";
};

const isMultiSelectProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.MultiSelectPropertyValue => {
  return prop.format === "multi_select";
};

const isFilesProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.FilesPropertyValue => {
  return prop.format === "files";
};

const isUrlProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.UrlPropertyValue => {
  return prop.format === "url";
};

const isEmailProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.EmailPropertyValue => {
  return prop.format === "email";
};

const isPhoneProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.PhonePropertyValue => {
  return prop.format === "phone";
};

const isObjectsProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.ObjectsPropertyValue => {
  return prop.format === "objects";
};

export const extractPropertyValue = (
  property: anyTypes.PropertyWithValue
): unknown => {
  if (isTextProperty(property)) {
    return property.text ?? null;
  } else if (isNumberProperty(property)) {
    return property.number ?? null;
  } else if (isDateProperty(property)) {
    return property.date ? Temporal.Instant.from(property.date) : null;
  } else if (isCheckboxProperty(property)) {
    return property.checkbox ?? null;
  } else if (isSelectProperty(property)) {
    return property.select?.name ?? null;
  } else if (isMultiSelectProperty(property)) {
    return property.multi_select
      ? property.multi_select.map((p) => p.name ?? "").filter(Boolean)
      : null;
  } else if (isFilesProperty(property)) {
    return property.files ?? null;
  } else if (isUrlProperty(property)) {
    return property.url ?? null;
  } else if (isEmailProperty(property)) {
    return property.email ?? null;
  } else if (isPhoneProperty(property)) {
    return property.phone ?? null;
  } else if (isObjectsProperty(property)) {
    return property.objects ?? null;
  } else {
    return null;
  }
};

export default mkClient;

export { anytype as openapi };