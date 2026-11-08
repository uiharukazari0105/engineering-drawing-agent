export type Preference = "auto" | "assisted" | "manual";
export type BusyState = "parse" | "fix" | "export" | "explain" | null;
export type AutoMode = "A0" | "A1" | "A2";
export type IssueLayer = "geometric" | "drawing_model" | "design_intent";
export type Severity = "low" | "medium" | "high";

export interface MetaResponse {
  llm_available: boolean;
  cadquery_available: boolean;
  thresholds: {
    high: number;
    low: number;
  };
}

export interface ParsedField {
  id: string;
  value: number;
  confidence: number;
  status: string;
  source: string;
  mode: AutoMode;
  needs_confirm: boolean;
}

export interface ParseResult {
  overall_mode: AutoMode;
  pending: string[];
  notes: string[];
  drawing: Record<string, unknown> | null;
  fields: ParsedField[];
}

export interface Issue {
  id: string;
  code: string;
  layer: IssueLayer;
  severity: Severity;
  confidence: number;
  location: Record<string, unknown>;
  evidence: string[];
  fixable: boolean;
  constraint_id?: string | null;
  fix_hint?: Record<string, unknown> | null;
}

export interface TaskResponse {
  task_id: string;
  state: string;
  parse: ParseResult;
  issues: Issue[];
  source_file?: string;
}

export interface FixChange {
  param: string;
  old: number;
  new: number;
}

export interface FixRecord {
  fix_id: string;
  issue_id: string;
  changes: FixChange[];
  affected_features: string[];
  affected_constraints: string[];
  regression_passed: boolean;
  rolled_back: boolean;
  budget_used: number;
  note: string;
}

export interface PendingConfirmation {
  issue: string;
  reason: string;
  confidence?: number;
  detail?: string;
}

export interface WorkflowResult {
  task_id: string;
  state: "DONE" | "STOPPED" | string;
  auto_mode: string;
  issues: Issue[];
  fixes: FixRecord[];
  pending_confirmation: PendingConfirmation[];
  budget: { used: number; total: number };
  resolved: number;
  remaining: string[];
  final_issues_total: number;
  final_values: Record<string, number>;
}

export interface GeometryHole {
  id: string;
  x: number;
  y: number;
  d: number | null;
}

export interface GeometryModel {
  kernel: string;
  bbox: { length: number; width: number; height: number };
  volume: number;
  hole_count: number;
  holes: GeometryHole[];
  note?: string;
}

export interface ParamComparison {
  param: string;
  before: number;
  after: number;
  delta: number;
}

export interface CompareResult {
  task_id: string;
  changed_params: ParamComparison[];
  resolved: string[];
  remaining: string[];
  before_issue_count: number;
  after_issue_count: number;
}

export interface Explanation {
  source: "llm" | "rules" | string;
  summary: string;
  changes: string;
  explanation: string;
}

export interface EvidenceResult {
  verification?: {
    all_ok: boolean;
  };
  [key: string]: unknown;
}

export interface ToastItem {
  id: string;
  tone: "ok" | "warn" | "err";
  title: string;
  description?: string;
}
