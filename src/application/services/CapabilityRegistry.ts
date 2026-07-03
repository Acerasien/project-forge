import { ICapability } from '../../domain/ai/ICapability'

export class CapabilityRegistry {
  private capabilities = new Map<string, ICapability>()

  public register(capability: ICapability): void {
    if (this.capabilities.has(capability.name)) {
      throw new Error(`Capability with name ${capability.name} is already registered.`)
    }
    this.capabilities.set(capability.name, capability)
  }

  public get(name: string): ICapability | undefined {
    return this.capabilities.get(name)
  }

  public getAll(): ICapability[] {
    return Array.from(this.capabilities.values())
  }
}
