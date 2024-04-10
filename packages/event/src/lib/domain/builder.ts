import { ClassType, ExcludeFunctions, OptionalProperties, RequiredProperties } from './types'

/**
 * Creates a new builder for the given type.
 *
 * The builder provides a fluent API for setting properties on the type.
 * Each property on the type has a corresponding `set` method on the builder.
 * Once all properties have been set, the `build` method can be called to create an instance of the type.
 *
 * If a class (constructor function) is provided as the `type` argument, the created instances will be of that class.
 * Otherwise, the created instances will be plain objects.
 *
 * @param {ClassType<T>} [type] - The class (constructor function) to create instances of.
 * @returns {IBuilder<T>} A builder for the given type.
 *
 * @template T The type of the instances to create.
 */
export const builder = <T>(type?: ClassType<T>, postBuildCallback?: (instance: T) => void): IBuilder<T> => {
  const object: Record<string, unknown> = {}
  const builder = new Proxy({} as IBuilder<T>, {
    get(_, prop) {
      if ('build' === prop) {
        const buildFunc = type ? () => Object.assign(Object.create(type.prototype), object) : () => ({ ...object })
        if (postBuildCallback) {
          return () => {
            const instance = buildFunc()
            postBuildCallback(instance)
            return instance
          }
        }
        return buildFunc
      }
      return (x: unknown) => {
        let propName = prop.toString().replace('set', '')
        propName = propName.charAt(0).toLocaleLowerCase() + propName.slice(1)
        object[propName] = x
        return builder
      }
    },
  }) as IBuilder<T>
  return builder
}

// export const from = <T, F>(type: ClassType<T>, from: F, exclude: keyof T): IBuilder<T> => {
//   const instanceProperies = Object.getOwnPropertyNames(type.prototype)

// }

export type InitializedIBuilder<T, R extends keyof T = never, O extends keyof T = never> = IBuilder<
  T,
  Exclude<keyof RequiredProperties<T>, R>,
  Exclude<keyof OptionalProperties<T>, O>,
  Pick<T, R | O>
>

/**
 * A TypeScript utility type for creating a fluent builder API.
 *
 * @template Type The object type that the builder will build.
 * @template Required The keys of the required properties of Type. Defaults to all required properties of Type.
 * @template Optional The keys of the optional properties of Type. Defaults to all optional properties of Type.
 * @template Builder The current state of the builder. Defaults to an empty object.
 *
 * @property {Function} set[PropertyName] A setter function for each required property of Type. Returns a new builder with the property set.
 * @property {Function} set[PropertyName] A setter function for each optional property of Type. Returns a new builder with the property set.
 * @property {Function} build A function that returns the built object if all required properties have been set, otherwise it is never.
 */
export type IBuilder<
  Type,
  // Required properties to set. Default to all required properties keys
  Required extends keyof Type = keyof RequiredProperties<Type>,
  // Optional properties to set. Default to all optional properties keys
  Optional extends keyof Type = keyof OptionalProperties<Type>,
  // current builder state. default empty object
  Builder = Record<string, never>,
> = {
  [Property in Required as `set${Capitalize<string & Property>}`]: (
    arg: Type[Property],
  ) => IBuilder<
    Type,
    Exclude<Required, Property>,
    Optional,
    Pick<Type, Exclude<keyof ExcludeFunctions<Type>, Exclude<Required, Property> | Optional>>
  >
} & {
  [Property in Optional as `set${Capitalize<string & Property>}`]-?: (
    arg: Type[Property],
  ) => IBuilder<
    Type,
    Required,
    Exclude<Optional, Property>,
    Pick<Type, Exclude<keyof ExcludeFunctions<Type>, Required | Exclude<Optional, Property>>>
  >
} & {
  // set builder type to never untill all required properties are set
  build: Builder extends RequiredProperties<Type> ? () => Type : never
}
