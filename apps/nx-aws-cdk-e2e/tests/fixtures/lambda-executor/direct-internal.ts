import { transitiveInternal } from '@proj/transitive-internal'
import { getFactors, isPrime as isPrimeAlias } from '@sigma-js/primes'
import * as primes from '@sigma-js/primes'

export function directInternal(input: number): string {
  return `\ndirect-internal. ${input} is ${isPrimeAlias(input) ? '' : 'not '}prime. Factors: ${getFactors(input).join(
    ', ',
  )}. Max number: ${primes.getMaxNum()}.${transitiveInternal(input)}`
}
