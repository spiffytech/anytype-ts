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
    
    result.push(createProperty(key, type, value))
  }
  
  return result
}

const propertyField: Record<PropertyType, string> = {
  text: 'text',
  number: 'number',
  date: 'date',
  checkbox: 'checkbox',
  select: 'select',
  multi_select: 'multi_select',
  email: 'email',
  phone: 'phone',
  url: 'url',
  files: 'files',
  objects: 'objects',
}

const createProperty = (
  key: string,
  type: PropertyType,
  value: PropertyValue | null
): anyTypes.PropertyLinkWithValue => {
  const field = propertyField[type] ?? 'text'
  
  if (value === null) {
    return { key, [field]: null }
  }
  
  if (type === 'date' && value instanceof Temporal.Instant) {
    return { key, [field]: value.toJSON() }
  }
  
  return { key, [field]: value }
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