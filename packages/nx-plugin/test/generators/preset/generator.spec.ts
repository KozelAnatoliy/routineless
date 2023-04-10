import { Tree, readProjectConfiguration } from '@nrwl/devkit'
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing'

import generator from '../../../src/generators/preset'
import type { PresetGeneratorSchema } from '../../../src/generators/preset/schema'

describe('preset generator', () => {
  let appTree: Tree
  const options: PresetGeneratorSchema = {}

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace()
  })

  it('should run successfully', async () => {
    await generator(appTree, options)

    const config = readProjectConfiguration(appTree, 'infra')
    expect(config).toBeDefined()
  })
})
