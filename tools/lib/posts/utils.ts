import { PageObject } from '../notion';

export function createPagePropertyMap(page: PageObject) {
  const properties = Object.fromEntries(Object.values(page.properties).map((prop) => [prop.id, prop]));
  return {
    get<PropType extends string>(id: string, type: PropType) {
      const prop = properties[id];
      if (!prop || !matchPropertyType(prop, type)) {
        return null;
      }
      return prop;
    },
  } as const;
}

function matchPropertyType<PropType extends string, Prop extends { type: string }>(
  property: Prop,
  type: PropType,
): property is MatchType<Prop, { type: PropType }> {
  return property.type === type;
}

export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}
