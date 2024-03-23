import { builder } from './builder'

describe('builder', () => {
  const testPerson: IPerson = {
    age: 25,
    name: 'Elon Musk',
    isAlive: true,
    sex: 'male',
  }
  const testPersonWithOptional: IPerson = {
    ...testPerson,
    favoriteColor: 'blue',
  }

  it('should build based on interface', () => {
    const builderInstance = builder<IPerson>()
      .setAge(testPerson.age)
      .setIsAlive(testPerson.isAlive)
      .setName(testPerson.name)
      .setSex(testPerson.sex)
    const buildedPerson = builderInstance.build()
    const buildedPersonWithOptional = builderInstance.setFavoriteColor('blue').build()

    expect(buildedPerson).toEqual(testPerson)
    expect(buildedPersonWithOptional).toEqual(testPersonWithOptional)
  })

  it('should build based on class', () => {
    const builderInstance = builder(Person)
      .setAge(testPerson.age)
      .setIsAlive(testPerson.isAlive)
      .setName(testPerson.name)
      .setSex(testPerson.sex)
    const buildedPerson = builderInstance.build()
    const buildedPersonWithOptional = builderInstance.setFavoriteColor(testPersonWithOptional.favoriteColor).build()

    expect(buildedPerson).toEqual(new Person(testPerson))
    expect(buildedPerson).toBeInstanceOf(Person)
    expect(buildedPerson.getDaysTillAge(26)).toEqual(365)
    expect(buildedPerson.isExtroordinary).toBeTruthy()
    expect(buildedPersonWithOptional).toEqual(new Person(testPersonWithOptional))
  })
})

interface IPerson {
  readonly name: string
  readonly sex: 'male' | 'female'
  readonly age: number
  readonly isAlive: boolean
  readonly favoriteColor?: string
}

class Person implements IPerson {
  private static EXTROORDINARY_PERSON = 'Elon Musk'
  readonly name: string
  readonly sex: 'male' | 'female'
  readonly age: number
  readonly isAlive: boolean
  readonly favoriteColor?: string

  constructor(person: IPerson) {
    this.name = person.name
    this.sex = person.sex
    this.age = person.age
    this.isAlive = person.isAlive
    if (person.favoriteColor) this.favoriteColor = person.favoriteColor
  }

  public isExtroordinary(): boolean {
    return this.name === Person.EXTROORDINARY_PERSON
  }

  public getDaysTillAge(age: number): number {
    return (age - this.age) * 365
  }
}
