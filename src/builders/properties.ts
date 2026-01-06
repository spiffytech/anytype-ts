import { Temporal } from "temporal-polyfill"
import * as anyTypes from "../anytype-openapi/types.gen"

export type PropertyType = string

export type PropertyTuple = [PropertyType, PropertyValue | null]

export type PropertyValue = 
  | Temporal.Instant
  | string 
  | number 
  | boolean 
  | string[]

export type PropertiesObject = Record<string, PropertyTuple | null>

export const createProperties = (
  properties: PropertiesObject
): anyTypes.PropertyLinkWithValue[] => {
  const result: anyTypes.PropertyLinkWithValue[] = []
  
  for (const [key, tuple] of Object.entries(properties)) {
    if (tuple === null) continue
    
    const [type, value] = tuple
    
    if (value === null) {
      result.push(createNullProperty(key, type))
    } else {
      result.push(createNonNullProperty(key, type, value))
    }
  }
  
  return result
}

const createNullProperty = (key: string, type: PropertyType): anyTypes.PropertyLinkWithValue => {
  switch (type) {
    case 'text': return { key, text: null as any }
    case 'number': return { key, number: null as any }
    case 'date': return { key, date: null as any }
    case 'checkbox': return { key, checkbox: null as any }
    case 'select': return { key, select: null as any }
    case 'multi_select': return { key, multi_select: null as any }
    case 'email': return { key, email: null as any }
    case 'phone': return { key, phone: null as any }
    case 'url': return { key, url: null as any }
    case 'files': return { key, files: null as any }
    case 'objects': return { key, objects: null as any }
    default: return { key, text: null as any }
  }
}

const createNonNullProperty = (
  key: string, 
  type: PropertyType, 
  value: PropertyValue
): anyTypes.PropertyLinkWithValue => {
  switch (type) {
    case 'text':
      return { key, text: value as string }
    case 'number':
      return { key, number: value as number }
    case 'date':
      if (value instanceof Temporal.Instant) {
        return { key, date: value.toJSON() }
      }
      return { key, date: value as string }
    case 'checkbox':
      return { key, checkbox: value as boolean }
    case 'select':
      return { key, select: value as string }
    case 'multi_select':
      return { key, multi_select: value as string[] }
    case 'email':
      return { key, email: value as string }
    case 'phone':
      return { key, phone: value as string }
    case 'url':
      return { key, url: value as string }
    case 'files':
      return { key, files: value as string[] }
    case 'objects':
      return { key, objects: value as string[] }
    default:
      return { key, text: String(value) }
  }
}

export const parseProperties = (
  properties: anyTypes.PropertyWithValue[] | null | undefined
): PropertiesObject => {
  const props = properties ?? []
  const result: PropertiesObject = {}
  
  for (const prop of props) {
    const key = prop.key
    if (!key) continue
    
    const type = prop.format as PropertyType
    const value = extractPropertyValue(prop)
    
    result[key] = [type, value]
  }
  
  return result
}

const extractPropertyValue = (
  property: anyTypes.PropertyWithValue
): PropertyValue | null => {
  const prop = property as any
  
  if (prop.format === 'date' && prop.date) {
    return Temporal.Instant.from(prop.date)
  }
  if (prop.format === 'multi_select' && prop.multi_select) {
    return prop.multi_select.map((tag: anyTypes.Tag) => tag.name ?? "").filter(Boolean)
  }
  if (prop.format === 'select' && prop.select) {
    return prop.select.name ?? null
  }
  if (prop.format === 'text') return prop.text ?? null
  if (prop.format === 'number') return prop.number ?? null
  if (prop.format === 'checkbox') return prop.checkbox ?? null
  if (prop.format === 'email') return prop.email ?? null
  if (prop.format === 'phone') return prop.phone ?? null
  if (prop.format === 'url') return prop.url ?? null
  if (prop.format === 'objects') return prop.objects ?? null
  if (prop.format === 'files') return prop.files ?? null
  
  return null
}