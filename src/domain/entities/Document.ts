export class Document {
  constructor(
    public readonly id: string,
    public readonly initiativeId: string,
    public name: string,
    public extension: string,
    public content: string,
    public preferredToolId: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}
}
