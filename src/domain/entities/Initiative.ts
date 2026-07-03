export class Initiative {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null,
    public status: 'Discovery' | 'InProgress' | 'Released' | 'Archived',
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}
}
