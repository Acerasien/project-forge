export class Conversation {
  constructor(
    public readonly id: string,
    public readonly initiativeId: string,
    public title: string,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}
}
