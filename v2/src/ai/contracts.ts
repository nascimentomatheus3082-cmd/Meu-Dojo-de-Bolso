export type AgentId = "dojo-sensei" | "technique-expert" | "belt-exam-coach" | "quiz-master" | "curriculum-guide" | "video-analyst" | "progress-coach" | "safety-reviewer";
export interface AgentRequest { agent: AgentId; message: string; context?: { belt?: string; lessonId?: string; locale?: "pt-BR" }; }
export interface AgentResponse { answer: string; agent: AgentId; sources?: Array<{ title: string; reference: string }>; safetyNote?: string; }
