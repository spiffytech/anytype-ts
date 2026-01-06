import type * as anyTypes from "../anytype-openapi/index"

export type FilterCondition = 
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'nContains'
  | 'in' | 'nin' | 'all'
  | 'empty' | 'nEmpty'

export type Filter = 
  | { and: Array<FilterItem | Filter> }
  | { or: Array<FilterItem | Filter> }

export type FilterItem = anyTypes.FilterItem

const convertFilter = (filter: Filter): anyTypes.FilterExpression => {
  if ('and' in filter) {
    const items = filter.and
    return {
      operator: 'and',
      conditions: items.filter(isFilterItem),
      filters: items.filter(isFilter).map(convertFilter)
    }
  }
  
  if ('or' in filter) {
    const items = filter.or
    return {
      operator: 'or',
      conditions: items.filter(isFilterItem),
      filters: items.filter(isFilter).map(convertFilter)
    }
  }
  
  throw new Error('Invalid filter')
}

const isFilter = (item: unknown): item is Filter => 
  typeof item === 'object' && item !== null && ('and' in item || 'or' in item)

const isFilterItem = (item: unknown): item is anyTypes.FilterItem =>
  !isFilter(item)

export { convertFilter }