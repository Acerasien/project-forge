export type FindingSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info'
export type FindingCategory =
  | 'Traceability'
  | 'Dependency'
  | 'Completeness'
  | 'Consistency'
  | 'Security'
  | 'Performance'
  | 'Other'

export class Finding {
  constructor(
    public readonly severity: FindingSeverity,
    public readonly category: FindingCategory,
    public readonly artifactId: string,
    public readonly message: string,
    public readonly recommendation: string,
    public readonly sourceCapability: string
  ) {}
}
