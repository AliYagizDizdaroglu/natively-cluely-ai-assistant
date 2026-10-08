// ../../../electron/knowledge/IntentClassifier.ts
var TECHNICAL_KEYWORDS = [
  "algorithm",
  "complexity",
  "design pattern",
  "architecture",
  "system design",
  "database",
  "sql",
  "api",
  "rest",
  "graphql",
  "microservice",
  "docker",
  "kubernetes",
  "ci/cd",
  "testing",
  "debugging",
  "optimize",
  "performance",
  "scalability",
  "data structure",
  "recursion",
  "concurrency",
  "thread",
  "async",
  "memory",
  "code",
  "implement",
  "build",
  "write",
  "function",
  "class",
  "object"
];
var INTRO_KEYWORDS = [
  "introduce yourself",
  "tell me about yourself",
  "who are you",
  "walk me through your background",
  "brief introduction",
  "self introduction"
];
var COMPANY_KEYWORDS = [
  "company",
  "culture",
  "values",
  "mission",
  "vision",
  "glassdoor",
  "reviews",
  "competitors",
  "industry",
  "market",
  "strategy",
  "product",
  "team",
  "growth",
  "benefits",
  "perks",
  "work life",
  "remote",
  "office",
  "environment"
];
var STRONG_NEGOTIATION = [
  "salary",
  "compensation",
  "negotiate",
  "negotiable",
  "equity",
  "rsu",
  "rsus",
  "signing bonus",
  "total comp",
  "market rate",
  "counteroffer",
  "counter offer"
];
var PROFILE_DETAIL_KEYWORDS = [
  "projects",
  "experience",
  "work history",
  "achievements",
  "certifications",
  "education",
  "skills",
  "background",
  "what have you",
  "tell me about your",
  "describe your",
  "walk me through",
  "portfolio",
  "leadership"
];
var escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function hasWord(lower, term) {
  return new RegExp(`(^|[^a-z0-9])${escapeRe(term)}(?![a-z0-9])`).test(lower);
}
function classifyIntent(question) {
  const lower = question.toLowerCase();
  if (INTRO_KEYWORDS.some((kw) => hasWord(lower, kw))) return "intro" /* INTRO */;
  const strong = STRONG_NEGOTIATION.some((kw) => hasWord(lower, kw));
  if (strong) return "negotiation" /* NEGOTIATION */;
  if (COMPANY_KEYWORDS.some((kw) => hasWord(lower, kw))) return "company_research" /* COMPANY_RESEARCH */;
  if (PROFILE_DETAIL_KEYWORDS.some((kw) => hasWord(lower, kw))) return "profile_detail" /* PROFILE_DETAIL */;
  if (TECHNICAL_KEYWORDS.some((kw) => hasWord(lower, kw))) return "technical" /* TECHNICAL */;
  return "general" /* GENERAL */;
}
function needsCompanyResearch(question) {
  const lower = question.toLowerCase();
  return COMPANY_KEYWORDS.some((kw) => lower.includes(kw));
}
export {
  classifyIntent,
  hasWord,
  needsCompanyResearch
};
