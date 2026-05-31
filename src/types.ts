export interface DecompiledMethod {
  name: string;
  returnType: string;
  arguments: { name: string; type: string }[];
  isClassMethod: boolean;
  notes?: string;
}

export interface DecompiledProperty {
  name: string;
  type: string;
  attributes: string[];
}

export interface DecompiledClass {
  name: string;
  superClass: string;
  protocols: string[];
  properties: DecompiledProperty[];
  methods: DecompiledMethod[];
}

export interface IpaMetadata {
  fileName: string;
  fileSize: string;
  bundleIdentifier: string;
  bundleName: string;
  displayName: string;
  minimumOSVersion: string;
  sdkVersion: string;
  architecture: string[];
  frameworks: string[];
  classes: DecompiledClass[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  explanation?: string;
  tweakCode?: string;
  commandRun?: {
    command: string;
    output: string;
  };
}

export interface ClaudeSettings {
  model: string;
  budgetTokens: number; // 0 = no thinking, 8000 = medium, 32000 = deep
}

export const DEFAULT_CLAUDE_SETTINGS: ClaudeSettings = {
  model: "claude-sonnet-4-6",
  budgetTokens: 0,
};

export const CLAUDE_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", desc: "Fastest · lowest cost", supportsThinking: false },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "Balanced · recommended", supportsThinking: true },
  { id: "claude-opus-4-8", label: "Opus 4.8", desc: "Most capable · slower", supportsThinking: true },
] as const;

export const EFFORT_LEVELS = [
  { label: "Standard", budgetTokens: 0, desc: "Fast, no extended thinking" },
  { label: "Deep", budgetTokens: 8000, desc: "~8k thinking tokens" },
  { label: "Max", budgetTokens: 32000, desc: "~32k thinking tokens · slow" },
] as const;

export interface Session {
  id: string;
  displayName: string;
  bundleId: string;
  fileName: string;
  createdAt: number;
  updatedAt: number;
  metadata: IpaMetadata;
  tweakCode: string;
  chatHistory: ChatMessage[];
  settings: ClaudeSettings;
}

export interface TweakProject {
  ipa: IpaMetadata | null;
  tweakCode: string;
  tweakLanguage: "logos" | "swift";
  chatHistory: ChatMessage[];
  status: "idle" | "uploading" | "analyzing" | "ready" | "compiling" | "completed";
  compileLogs: string[];
  error: string | null;
}
