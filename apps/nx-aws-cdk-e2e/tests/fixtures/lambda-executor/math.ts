import { sqrt } from 'mathjs'

export const getSqrt = (input: number): string => {
  return sqrt(input).toString()
}
