import { Temporal } from "temporal-polyfill";

import * as anytype from "./anytype-openapi";
import type * as anyTypes from "./anytype-openapi";
export type * from "./anytype-openapi";

export const anytypeVersion = "2025-05-20";

const mkClient = (key: string) => {
  const headers = {
    "Anytype-Version": anytypeVersion,
    Authorization: `Bearer ${key}`,
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

      // Check if we should continue pagination
      const pagination = response.data.pagination;
      if (!pagination?.has_more || items.length === 0) break;

      // Update offset for next page - handle undefined pagination values safely
      if (pagination.offset !== undefined && pagination.limit !== undefined) {
        offset = pagination.offset + pagination.limit;
      } else {
        // Only break if pagination metadata is malformed
        break;
      }
    }
  }

  const searchSpace = async function* (
    spaceId: string,
    params: anyTypes.SearchRequest & { limit?: number; offset?: number }
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: AnytypeSimplePropertiesObject;
    },
    void,
    void
  > {
    const { offset, limit, ...baseParams } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.searchSpace({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
        body: { ...baseParams },
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield {
        ...item,
        propertiesRaw: item.properties,
        properties: mapPropertiesToSimpleObject(item.properties),
      };
    }
  };

  const getObject = async (path: anytype.GetObjectData["path"]) => {
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
        properties: mapPropertiesToSimpleObject(object.properties),
      };
    } catch (error) {
      return undefined;
    }
  };

  // Authentication endpoints
  const createChallenge = async (appName: string) => {
    const response = await anytype.createAuthChallenge({
      headers,
      body: { app_name: appName },
      throwOnError: true,
    });
    return response.data;
  };

  const createApiKey = async (challengeId: string, code: string) => {
    const response = await anytype.createApiKey({
      headers,
      body: { challenge_id: challengeId, code },
      throwOnError: true,
    });
    return response.data;
  };

  // Search endpoints
  const searchGlobal = async function* (
    params: anyTypes.SearchRequest & { limit?: number; offset?: number }
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: AnytypeSimplePropertiesObject;
    },
    void,
    void
  > {
    const { offset, limit, ...baseParams } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.searchGlobal({
        headers,
        throwOnError: true,
        body: { ...baseParams },
        query: { offset, limit },
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield {
        ...item,
        propertiesRaw: item.properties,
        properties: mapPropertiesToSimpleObject(item.properties),
      };
    }
  };

  // Space management endpoints
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
    const response = await anytype.createSpace({
      headers,
      body: { name, description },
      throwOnError: true,
    });
    return response.data;
  };

  const getSpace = async (spaceId: string) => {
    try {
      const response = await anytype.getSpace({
        headers,
        path: { space_id: spaceId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  const updateSpace = async (
    spaceId: string,
    name?: string,
    description?: string
  ) => {
    const response = await anytype.updateSpace({
      headers,
      path: { space_id: spaceId },
      body: { name, description },
      throwOnError: true,
    });
    return response.data;
  };

  // Object endpoints
  const listObjects = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<
    Omit<anyTypes.Object, "properties"> & {
      propertiesRaw: anyTypes.PropertyWithValue[] | null | undefined;
      properties: AnytypeSimplePropertiesObject;
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
        properties: mapPropertiesToSimpleObject(item.properties),
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
      properties?: Array<anyTypes.PropertyLinkWithValue>;
    } = {}
  ) => {
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
        properties,
      },
      throwOnError: true,
    });
    if (!response.data?.object) return undefined;
    const object = response.data.object;
    return {
      ...object,
      properties: mapPropertiesToSimpleObject(object.properties),
    };
  };

  const updateObject = async (
    spaceId: string,
    objectId: string,
    params: {
      name?: string;
      icon?: anyTypes.Icon;
      properties?: Array<anyTypes.PropertyLinkWithValue>;
    } = {}
  ) => {
    const { name, icon, properties } = params;
    const response = await anytype.updateObject({
      headers,
      path: { space_id: spaceId, object_id: objectId },
      body: { name, icon, properties },
      throwOnError: true,
    });
    if (!response.data?.object) return undefined;
    const object = response.data.object;
    return {
      ...object,
      properties: mapPropertiesToSimpleObject(object.properties),
    };
  };

  const deleteObject = async (spaceId: string, objectId: string) => {
    const response = await anytype.deleteObject({
      headers,
      path: { space_id: spaceId, object_id: objectId },
      throwOnError: true,
    });
    return response.data;
  };

  // Type endpoints
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
    try {
      const response = await anytype.getType({
        headers,
        path: { space_id: spaceId, type_id: typeId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
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
    const response = await anytype.deleteType({
      headers,
      path: { space_id: spaceId, type_id: typeId },
      throwOnError: true,
    });
    return response.data;
  };

  // Property endpoints (experimental)
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
    const response = await anytype.createProperty({
      headers,
      path: { space_id: spaceId },
      body: { name, format, key },
      throwOnError: true,
    });
    return response.data;
  };

  const getProperty = async (spaceId: string, propertyId: string) => {
    try {
      const response = await anytype.getProperty({
        headers,
        path: { space_id: spaceId, property_id: propertyId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  const updateProperty = async (
    spaceId: string,
    propertyId: string,
    name: string,
    key?: string
  ) => {
    const response = await anytype.updateProperty({
      headers,
      path: { space_id: spaceId, property_id: propertyId },
      body: { name, key },
      throwOnError: true,
    });
    return response.data;
  };

  const deleteProperty = async (spaceId: string, propertyId: string) => {
    const response = await anytype.deleteProperty({
      headers,
      path: { space_id: spaceId, property_id: propertyId },
      throwOnError: true,
    });
    return response.data;
  };

  // Template endpoints
  const listTemplates = async function* (
    spaceId: string,
    typeId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Object, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listTemplates({
        headers,
        path: { space_id: spaceId, type_id: typeId },
        throwOnError: true,
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
    try {
      const response = await anytype.getTemplate({
        headers,
        path: { space_id: spaceId, type_id: typeId, template_id: templateId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  // List endpoints
  const addObjectsToList = async (
    spaceId: string,
    listId: string,
    objects: string[]
  ) => {
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
      properties: AnytypeSimplePropertiesObject;
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
        properties: mapPropertiesToSimpleObject(item.properties),
      };
    }
  };

  // Member endpoints
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
    try {
      const response = await anytype.getMember({
        headers,
        path: { space_id: spaceId, member_id: memberId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  // Tag endpoints
  const listTags = async function* (
    spaceId: string,
    propertyId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.Tag, void, void> {
    const { offset, limit } = params;
    const fetchPage = (offset: number | undefined, limit: number | undefined) =>
      anytype.listTags({
        headers,
        path: { space_id: spaceId, property_id: propertyId },
        throwOnError: true,
      });

    for await (const item of paginateAnytype(fetchPage, { offset, limit })) {
      yield item;
    }
  };

  const createTag = async (
    spaceId: string,
    propertyId: string,
    name: string,
    color: anyTypes.Color
  ) => {
    const response = await anytype.createTag({
      headers,
      path: { space_id: spaceId, property_id: propertyId },
      body: { name, color },
      throwOnError: true,
    });
    return response.data;
  };

  const getTag = async (spaceId: string, propertyId: string, tagId: string) => {
    try {
      const response = await anytype.getTag({
        headers,
        path: { space_id: spaceId, property_id: propertyId, tag_id: tagId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  const updateTag = async (
    spaceId: string,
    propertyId: string,
    tagId: string,
    name?: string,
    color?: anyTypes.Color
  ) => {
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
    const response = await anytype.deleteTag({
      headers,
      path: { space_id: spaceId, property_id: propertyId, tag_id: tagId },
      throwOnError: true,
    });
    return response.data;
  };

  return {
    searchSpace,
    getObject,
    // Authentication
    createChallenge,
    createApiKey,
    // Search
    searchGlobal,
    // Space management
    listSpaces,
    createSpace,
    getSpace,
    updateSpace,
    // Objects
    listObjects,
    createObject,
    updateObject,
    deleteObject,
    // Types
    listTypes,
    createType,
    getType,
    updateType,
    deleteType,
    // Properties (experimental)
    listProperties,
    createProperty,
    getProperty,
    updateProperty,
    deleteProperty,
    // Templates
    listTemplates,
    getTemplate,
    // Lists
    addObjectsToList,
    removeObjectFromList,
    getListViews,
    getObjectsInList,
    // Members
    listMembers,
    getMember,
    // Tags
    listTags,
    createTag,
    getTag,
    updateTag,
    deleteTag,
  };
};

/**
 * Extract the "real" value from a property, applying appropriate data coercion.
 * This provides direct value extraction with proper type coercion.
 */
/**
 * Type guard to check if a property is a text property
 */
const isTextProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.TextPropertyValue => {
  return prop.format === "text";
};

/**
 * Type guard to check if a property is a number property
 */
const isNumberProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.NumberPropertyValue => {
  return prop.format === "number";
};

/**
 * Type guard to check if a property is a date property
 */
const isDateProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.DatePropertyValue => {
  return prop.format === "date";
};

/**
 * Type guard to check if a property is a checkbox property
 */
const isCheckboxProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.CheckboxPropertyValue => {
  return prop.format === "checkbox";
};

/**
 * Type guard to check if a property is a select property
 */
const isSelectProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.SelectPropertyValue => {
  return prop.format === "select";
};

/**
 * Type guard to check if a property is a multi-select property
 */
const isMultiSelectProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.MultiSelectPropertyValue => {
  return prop.format === "multi_select";
};

/**
 * Type guard to check if a property is a files property
 */
const isFilesProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.FilesPropertyValue => {
  return prop.format === "files";
};

/**
 * Type guard to check if a property is a URL property
 */
const isUrlProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.UrlPropertyValue => {
  return prop.format === "url";
};

/**
 * Type guard to check if a property is an email property
 */
const isEmailProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.EmailPropertyValue => {
  return prop.format === "email";
};

/**
 * Type guard to check if a property is a phone property
 */
const isPhoneProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.PhonePropertyValue => {
  return prop.format === "phone";
};

/**
 * Type guard to check if a property is an objects property
 */
const isObjectsProperty = (
  prop: anyTypes.PropertyWithValue
): prop is anyTypes.ObjectsPropertyValue => {
  return prop.format === "objects";
};

/**
 * Extract the "real" value from a property, applying appropriate data coercion.
 * This replaces the PropertyWrapper approach with direct value extraction.
 */
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

/**
 * Simplified properties object where values are the "real" coerced values directly accessible.
 * This provides direct access to property values with proper type coercion.
 */
export type AnytypeSimplePropertiesObject = Record<string, unknown>;

/**
 * Map Anytype properties array to a simple object with direct value access.
 * Values are extracted and coerced appropriately (dates become Temporal.Instant, selects become tag names, etc.)
 */
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

export default mkClient;

export { anytype as openapi };
