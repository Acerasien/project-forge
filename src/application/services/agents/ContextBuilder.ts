import { IContextProvider } from './IContextProvider'

export interface EngineeringContext {
  initiativeId: string
  data: Record<string, unknown>
}

export class ContextBuilder {
  constructor(private readonly providers: IContextProvider[]) {}

  async build(initiativeId: string): Promise<EngineeringContext> {
    const context: EngineeringContext = {
      initiativeId,
      data: {}
    }

    for (const provider of this.providers) {
      try {
        await provider.buildContext(initiativeId, context)
      } catch (err) {
        console.warn(`Context provider ${provider.name} failed:`, err)
      }
    }

    return context
  }
}
