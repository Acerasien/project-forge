import { EngineeringContext } from './ContextBuilder'

export interface IContextProvider {
  name: string
  buildContext(initiativeId: string, currentContext: EngineeringContext): Promise<void>
}
