export type Player = {
  id: string;
  name: string;
  color?: string;
};

export type Group = {
  id: string;
  name: string;
  playerIds: string[];
};

export type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  assistPrestigeSent?: number;
  assistPrestigeBySource?: Record<string, number>;
  assistCountBySource?: Record<string, number>;
  objectivePrestige?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
  performance?: number;
  efficiency?: number;
  assistedEfficiency?: number;
  directEfficiency?: number;
};

export type StoredGamePlayer = {
  id: string;
  name?: string;
  color?: string;
  startOrder?: number;
};

export type StoredGame = {
  id?: string;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  totals?: Record<string, Totals>;
  players?: StoredGamePlayer[];
  objectiveStatsEligible?: boolean;
  createdAt?: number;
  groupId?: string;
  groupName?: string;
};

export type CompareStoreShape = {
  players?: Player[];
  groups?: Group[];
  games?: StoredGame[];
};

export type CompareMode = 'players' | 'groups';
export type DensityMode = 'dense' | 'comfortable';
export type SortDirection = 'desc' | 'asc';
export type CompareDirection = 'higher' | 'lower' | 'neutral';
export type MetricKind = 'count' | 'decimal' | 'percent' | 'signed' | 'correlation';

export type MetricGroupKey =
  | 'outcomes'
  | 'prestige'
  | 'assists'
  | 'objectives'
  | 'efficiency'
  | 'positioning';

export type MetricGroup = {
  key: MetricGroupKey;
  label: string;
  accent: string;
};

export type RowPalette = {
  solid: string;
  border: string;
  softBg: string;
  priorityBg: string;
  glow: string;
  strong: string;
};

export type CompareRow = {
  id: string;
  label: string;
  subtitle: string;
  members: number;
  color: string;
  palette: RowPalette;
  games: number;
  prestige: number;
  directPrestige: number;
  assistPrestigeReceived: number;
  assistPrestigeSent: number;
  objectivePrestige: number;
  objectiveTrackedGames: number;
  score: number;
  assists: number;
  failures: number;
  contracts: number;
  wins: number;
  objectiveWins: number;
  winRate: number;
  closeGames: number;
  closeGameRate: number;
  avgPrestigePerGame: number;
  avgScorePerGame: number;
  efficiency: number;
  assistedEfficiency: number;
  directEfficiency: number;
  efficiencyTier: string;
  assistEfficiencyTier: string;
  directEfficiencyTier: string;
  contractFailureRatio: number;
  avgPrestigeMargin: number;
  avgScoreMargin: number;
  netAssistBenefit: number;
  synergyIndex: number;
  avgStartOrder: number;
  turnOrderWinCorrelation: number;
  assistWinCorrelation: number;
  dataConfidenceScore: number;
  dataConfidenceLabel: 'low' | 'medium' | 'strong';
  avgObjectivesPerTrackedGame: number;
  objectiveWinRateTracked: number;
  objectiveShareOfPrestige: number;
};

export type MetricDescriptor = {
  key: keyof CompareRow | string;
  label: string;
  description: string;
  group: MetricGroupKey;
  kind: MetricKind;
  direction: CompareDirection;
  topMetric?: boolean;
  getValue: (row: CompareRow) => number;
  format: (row: CompareRow) => string;
};

export type GlobalTurnOrderInsight = {
  correlation: number;
  samples: number;
  seatLines: string[];
};

export type MatrixLayout = {
  metricColumnWidth: number;
  dataColumnWidth: number;
  rowHeight: number;
  headerHeight: number;
  cellGap: number;
  metricFontSize: number;
  valueFontSize: number;
  deltaFontSize: number;
  headerTitleFontSize: number;
  headerSubtitleFontSize: number;
  cellPaddingH: number;
  cellPaddingV: number;
  matrixHeight: number;
};

export type VisibleMetricEntry =
  | { type: 'group'; group: MetricGroup }
  | { type: 'metric'; metric: MetricDescriptor };

export type ConditionalSelectionMode = 'must' | 'may';
export type ConditionalViewMode = 'present' | 'absent';
export type ConditionalSubjectMode = CompareMode;

export type ConditionalPlayerDelta = {
  id: string;
  name: string;
  color: string;
  isAnchor: boolean;
  entityType: ConditionalSubjectMode;
  sampleGames: number;
  overallGames: number;
  sampleWinRate: number;
  overallWinRate: number;
  winRateDelta: number;
  samplePrestigePerGame: number;
  overallPrestigePerGame: number;
  prestigeDelta: number;
  sampleScorePerGame: number;
  overallScorePerGame: number;
  scoreDelta: number;
  sampleEfficiency: number;
  overallEfficiency: number;
  efficiencyDelta: number;
  sampleSynergy: number;
  overallSynergy: number;
  synergyDelta: number;
};

export type ConditionalConfidence = 'low' | 'medium' | 'strong';

export type ConditionalAnalysis = {
  subjectMode: ConditionalSubjectMode;
  anchorId: string | null;
  mustIncludeIds: string[];
  mayIncludeIds: string[];
  excludedMode: boolean;
  matchedGames: StoredGame[];
  overlapStrength: number;
  confidence: ConditionalConfidence;
  players: ConditionalPlayerDelta[];
};

export type ConditionalSortKey =
  | 'name'
  | 'sampleGames'
  | 'winRateDelta'
  | 'prestigeDelta'
  | 'scoreDelta'
  | 'efficiencyDelta'
  | 'synergyDelta';

export type ConditionalState = {
  subjectMode: ConditionalSubjectMode;
  mustIncludeIds: string[];
  mayIncludeIds: string[];
  anchorId: string | null;
  selectionMode: ConditionalSelectionMode;
  viewMode: ConditionalViewMode;
  selectorCollapsed: boolean;
  sortKey: ConditionalSortKey;
  sortDirection: SortDirection;
};

export type ConditionalAction =
  | { type: 'toggle-subject'; id: string }
  | { type: 'remove-subject'; id: string }
  | { type: 'set-anchor'; id: string | null }
  | { type: 'set-subject-mode'; mode: ConditionalSubjectMode }
  | { type: 'set-selection-mode'; mode: ConditionalSelectionMode }
  | { type: 'set-view-mode'; mode: ConditionalViewMode }
  | { type: 'toggle-selector-collapsed' }
  | { type: 'clear' }
  | { type: 'set-sort'; key: ConditionalSortKey }
  | { type: 'apply-preset'; ids: string[]; anchorId?: string | null };
