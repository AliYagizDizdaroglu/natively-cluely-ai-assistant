import { DetectionResponse } from '../llm/prompts/questionDetection';

export interface DetectionInput {
    recentInterviewerTranscript: string;
    fullConversationContext: string;
}

export interface DetectionClient {
    detect(input: DetectionInput): Promise<DetectionResponse | null>;
}
