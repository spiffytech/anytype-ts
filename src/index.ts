import { Temporal } from "temporal-polyfill";

import * as anytype from "./anytype-openapi";
import type * as anyTypes from "./anytype-openapi";

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
    params: anyTypes.ApimodelSearchRequest & { limit?: number; offset?: number }
  ): AsyncGenerator<
    Omit<anyTypes.ApimodelObject, "properties"> & {
      properties: AnytypePropertiesObject;
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
      yield { ...item, properties: mapPropertiesByKey(item.properties) };
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
      return { ...object, properties: mapPropertiesByKey(object.properties) };
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
    params: anyTypes.ApimodelSearchRequest & { limit?: number; offset?: number }
  ): AsyncGenerator<
    Omit<anyTypes.ApimodelObject, "properties"> & {
      properties: AnytypePropertiesObject;
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
      yield { ...item, properties: mapPropertiesByKey(item.properties) };
    }
  };

  // Space management endpoints
  const listSpaces = async function* (
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.ApimodelSpace, void, void> {
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
    Omit<anyTypes.ApimodelObject, "properties"> & {
      properties: AnytypePropertiesObject;
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
      yield { ...item, properties: mapPropertiesByKey(item.properties) };
    }
  };

  const createObject = async (
    spaceId: string,
    typeKey: string,
    params: {
      name?: string;
      body?: string;
      icon?: anyTypes.ApimodelIcon;
      templateId?: string;
      properties?: Array<anyTypes.ApimodelPropertyLinkWithValue>;
    } = {}
  ) => {
    try {
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
      return { ...object, properties: mapPropertiesByKey(object.properties) };
    } catch (error) {
      return undefined;
    }
  };

  const updateObject = async (
    spaceId: string,
    objectId: string,
    params: {
      name?: string;
      icon?: anyTypes.ApimodelIcon;
      properties?: Array<anyTypes.ApimodelPropertyLinkWithValue>;
    } = {}
  ) => {
    try {
      const { name, icon, properties } = params;
      const response = await anytype.updateObject({
        headers,
        path: { space_id: spaceId, object_id: objectId },
        body: { name, icon, properties },
        throwOnError: true,
      });
      if (!response.data?.object) return undefined;
      const object = response.data.object;
      return { ...object, properties: mapPropertiesByKey(object.properties) };
    } catch (error) {
      return undefined;
    }
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
  ): AsyncGenerator<anyTypes.ApimodelType, void, void> {
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
    layout: anyTypes.ApimodelTypeLayout,
    params: {
      key?: string;
      icon?: anyTypes.ApimodelIcon;
      properties?: Array<anyTypes.ApimodelPropertyLink>;
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
    layout?: anyTypes.ApimodelTypeLayout,
    params: {
      key?: string;
      icon?: anyTypes.ApimodelIcon;
      properties?: Array<anyTypes.ApimodelPropertyLink>;
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
    try {
      const response = await anytype.deleteType({
        headers,
        path: { space_id: spaceId, type_id: typeId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  // Property endpoints (experimental)
  const listProperties = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.ApimodelProperty, void, void> {
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
    format: anyTypes.ApimodelPropertyFormat,
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
    try {
      const response = await anytype.deleteProperty({
        headers,
        path: { space_id: spaceId, property_id: propertyId },
        throwOnError: true,
      });
      return response.data;
    } catch (error) {
      return undefined;
    }
  };

  // Template endpoints
  const listTemplates = async function* (
    spaceId: string,
    typeId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.ApimodelObject, void, void> {
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
  ): AsyncGenerator<anyTypes.ApimodelView, void, void> {
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
    Omit<anyTypes.ApimodelObject, "properties"> & {
      properties: AnytypePropertiesObject;
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
      yield { ...item, properties: mapPropertiesByKey(item.properties) };
    }
  };

  // Member endpoints
  const listMembers = async function* (
    spaceId: string,
    params: { limit?: number; offset?: number } = {}
  ): AsyncGenerator<anyTypes.ApimodelMember, void, void> {
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
  ): AsyncGenerator<anyTypes.ApimodelTag, void, void> {
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
    color: anyTypes.ApimodelColor
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
    color?: anyTypes.ApimodelColor
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
 * A wrapper for Anytype properties that provides type-safe access to values.
 */
export class PropertyWrapper<T extends anyTypes.ApimodelPropertyWithValue> {
  constructor(private property: T) {
    // Directly assign all properties from the wrapped object to this instance
    Object.assign(this, property);
  }

  /**
   * Returns the value of a text property, or undefined if it's not a text property.
   */
  text(): string | undefined {
    if (this.property.format === "text" && "text" in this.property) {
      return this.property.text;
    }
    return undefined;
  }

  /**
   * Returns the value of a number property, or undefined if it's not a number property.
   */
  number(): number | undefined {
    if (this.property.format === "number" && "number" in this.property) {
      return this.property.number;
    }
    return undefined;
  }

  /**
   * Returns the value of a date property, or undefined if it's not a date property.
   */
  date(): Temporal.Instant | undefined {
    if (
      this.property.format === "date" &&
      "date" in this.property &&
      this.property.date
    ) {
      return Temporal.Instant.from(this.property.date);
    }
    return undefined;
  }

  /**
   * Returns the value of a checkbox property, or undefined if it's not a checkbox property.
   */
  checkbox(): boolean | undefined {
    if (this.property.format === "checkbox" && "checkbox" in this.property) {
      return this.property.checkbox;
    }
    return undefined;
  }

  /**
   * Returns the name of a select property's value, or undefined if it's not a select property.
   */
  select(): string | undefined {
    if (this.property.format === "select" && "select" in this.property) {
      return this.property.select?.name;
    }
    return undefined;
  }

  /**
   * Returns the value of a multi-select property, or undefined if it's not a multi-select property.
   */
  multiSelect(): string[] | undefined {
    if (
      this.property.format === "multi_select" &&
      "multi_select" in this.property &&
      this.property.multi_select
    ) {
      return this.property.multi_select
        .map((p) => p.name ?? "")
        .filter(Boolean);
    }
    return undefined;
  }

  /**
   * Returns the value of a files property, or undefined if it's not a files property.
   */
  files(): string[] | undefined {
    if (this.property.format === "files" && "files" in this.property) {
      return this.property.files;
    }
    return undefined;
  }

  /**
   * Returns the value of a URL property, or undefined if it's not a URL property.
   */
  url(): string | undefined {
    if (this.property.format === "url" && "url" in this.property) {
      return this.property.url;
    }
    return undefined;
  }

  /**
   * Returns the value of an email property, or undefined if it's not an email property.
   */
  email(): string | undefined {
    if (this.property.format === "email" && "email" in this.property) {
      return this.property.email;
    }
    return undefined;
  }

  /**
   * Returns the value of a phone property, or undefined if it's not a phone property.
   */
  phone(): string | undefined {
    if (this.property.format === "phone" && "phone" in this.property) {
      return this.property.phone;
    }
    return undefined;
  }

  /**
   * Returns the value of an objects property, or undefined if it's not an objects property.
   */
  objects(): string[] | undefined {
    if (this.property.format === "objects" && "objects" in this.property) {
      return this.property.objects;
    }
    return undefined;
  }

  /**
   * Returns the original, unwrapped property object.
   */
  unwrap(): T {
    return this.property;
  }
}

/**
 * Map Anytype properties array to an object keyed by property key.
 * Values are the original, unmodified property objects from the array.
 */
export type AnytypePropertiesObject = Record<
  string,
  PropertyWrapper<anyTypes.ApimodelPropertyWithValue>
>;

export const mapPropertiesByKey = (
  properties: anyTypes.ApimodelPropertyWithValue[] | null | undefined
): AnytypePropertiesObject => {
  const props = properties ?? [];

  return Object.fromEntries(
    props
      .filter((p) => Boolean(p.key))
      .map((p) => [p.key, new PropertyWrapper(p)])
  );
};

export default mkClient;

export { anytype as openapi };
