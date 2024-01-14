export const capitalize = (input?: string) => {
  if (!input) return input
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export const toCamelCase = (input: string) =>
  input.indexOf('-') >= 0 || input.indexOf('_') >= 0
    ? input.toLowerCase().replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
    : input
