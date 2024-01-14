import isEven from 'is-even'

export function transitiveInternal(input: number): string {
  return `\ntransitive-internal. ${input} is ${isEven(input) ? 'even' : 'odd'}.`
}
