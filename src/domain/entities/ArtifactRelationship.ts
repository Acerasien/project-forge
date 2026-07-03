export type RelationshipType =
  'DerivedFrom' | 'InformedBy' | 'DecidedBy' | 'Implements' | 'Generated' | 'SupersededBy'

export class ArtifactRelationship {
  constructor(
    public readonly id: string,
    public readonly sourceId: string,
    public readonly targetId: string,
    public readonly type: RelationshipType,
    public readonly createdAt: Date
  ) {}
}
