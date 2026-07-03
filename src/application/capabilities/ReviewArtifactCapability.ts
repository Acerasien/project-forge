import { ICapability, CapabilityResult } from '../../domain/ai/ICapability'
import { ValidationService } from '../services/ValidationService'

export class ReviewArtifactCapability implements ICapability {
  name = 'review_artifact'
  description =
    'Reviews an engineering artifact using AI and stores a critique summary, scores, risks, and improvements.'
  parameters = {
    type: 'object',
    properties: {
      artifactId: {
        type: 'string',
        description: 'The ID of the artifact to review.'
      }
    },
    required: ['artifactId']
  }

  constructor(private readonly validationService: ValidationService) {}

  async execute(
    args: Record<string, any>,
    _context?: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const { artifactId } = args

    if (!artifactId) {
      return { success: false, summary: 'Error: artifactId is required' }
    }

    try {
      const intelligence = await this.validationService.reviewArtifact(artifactId)

      return {
        success: true,
        summary: `Successfully reviewed artifact ${artifactId}.`,
        data: intelligence
      }
    } catch (error: any) {
      return { success: false, summary: `Failed to review artifact: ${error.message}` }
    }
  }
}
