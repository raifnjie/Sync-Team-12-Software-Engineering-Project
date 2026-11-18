/**
 * Post-graduation options and experiences that Sync can recommend (FR-10.4).
 *
 * SAMPLE DATA: generic listings with illustrative deadlines, used until real
 * opportunities are stored in the database (FR-10.2) or imported by an admin.
 */

export type Goal = "industry" | "grad-school" | "undecided";

export type OpportunityKind =
  | "grad-program"
  | "job"
  | "internship"
  | "research"
  | "certification"
  | "club";

export interface Opportunity {
  id: string;
  /** "post-grad" = what to do after graduating; "experience" = what to do while in school */
  category: "post-grad" | "experience";
  kind: OpportunityKind;
  title: string;
  organization: string;
  description: string;
  /** Which post-graduation goals this supports */
  goals: Goal[];
  tags: string[];
  /** Courses that prepare a student for this opportunity */
  relatedCourses: string[];
  /** Application deadline, "YYYY-MM-DD" */
  deadline?: string;
}

export const opportunities: Opportunity[] = [
  // ── Post-graduation ──
  {
    id: "pg-ms-cs",
    category: "post-grad",
    kind: "grad-program",
    title: "M.S. in Computer Science",
    organization: "Graduate program (thesis or coursework track)",
    description: "Two-year master's degree with room to specialize in AI, systems, or theory.",
    goals: ["grad-school"],
    tags: ["ai", "theory", "systems", "research"],
    relatedCourses: ["CSC 4520", "CSC 4810", "CSC 4330"],
    deadline: "2027-02-01",
  },
  {
    id: "pg-ms-ds",
    category: "post-grad",
    kind: "grad-program",
    title: "M.S. in Data Science",
    organization: "Graduate program",
    description: "Statistics, machine learning, and large-scale data systems.",
    goals: ["grad-school"],
    tags: ["data", "ai", "math"],
    relatedCourses: ["MATH 3020", "CSC 4710", "CSC 4850", "CSC 4760"],
    deadline: "2027-03-15",
  },
  {
    id: "pg-online-ms",
    category: "post-grad",
    kind: "grad-program",
    title: "Part-time online M.S. in Computer Science",
    organization: "Online graduate program",
    description: "Keep a full-time job while earning a master's degree one or two courses at a time.",
    goals: ["grad-school", "industry"],
    tags: ["ai", "systems", "software"],
    relatedCourses: ["CSC 4520", "CSC 4320"],
    deadline: "2027-03-01",
  },
  {
    id: "pg-new-grad-swe",
    category: "post-grad",
    kind: "job",
    title: "New-grad Software Engineer",
    organization: "Full-time role at a tech company",
    description: "Entry-level software engineering roles; most hiring for next fall opens in the winter.",
    goals: ["industry"],
    tags: ["software", "web", "systems"],
    relatedCourses: ["CSC 3350", "CSC 4350", "CSC 4520"],
    deadline: "2026-12-15",
  },
  {
    id: "pg-data-engineer",
    category: "post-grad",
    kind: "job",
    title: "New-grad Data Analyst / Data Engineer",
    organization: "Full-time role",
    description: "Build data pipelines and dashboards; strong SQL and statistics expected.",
    goals: ["industry"],
    tags: ["data"],
    relatedCourses: ["CSC 4710", "CSC 4760", "MATH 3020"],
    deadline: "2027-01-31",
  },
  {
    id: "pg-security-analyst",
    category: "post-grad",
    kind: "job",
    title: "Security Analyst",
    organization: "Full-time role",
    description: "Monitor and defend networks; security coursework and a certification help.",
    goals: ["industry"],
    tags: ["security", "systems"],
    relatedCourses: ["CSC 4222", "CSC 4226", "CSC 4220"],
  },

  // ── Experiences while in school ──
  {
    id: "ex-research",
    category: "experience",
    kind: "research",
    title: "Undergraduate research assistant (machine learning lab)",
    organization: "Faculty research lab",
    description: "Work with a professor on a research project; strong preparation for graduate school.",
    goals: ["grad-school"],
    tags: ["ai", "research", "data"],
    relatedCourses: ["CSC 4850", "MATH 3020", "MATH 2641"],
    deadline: "2027-01-15",
  },
  {
    id: "ex-swe-intern",
    category: "experience",
    kind: "internship",
    title: "Summer software engineering internship",
    organization: "Internship",
    description: "Ten to twelve weeks building production software with a mentor.",
    goals: ["industry"],
    tags: ["software", "web"],
    relatedCourses: ["CSC 2720", "CSC 3350", "CSC 4350"],
    deadline: "2026-12-01",
  },
  {
    id: "ex-ta",
    category: "experience",
    kind: "research",
    title: "Teaching assistant for intro programming",
    organization: "Computer Science department",
    description: "Lead lab sections and hold office hours; looks good on graduate applications.",
    goals: ["grad-school"],
    tags: ["theory", "software"],
    relatedCourses: ["CSC 1301", "CSC 1302", "CSC 2720"],
  },
  {
    id: "ex-hackathon",
    category: "experience",
    kind: "club",
    title: "Campus hackathon",
    organization: "Student organization",
    description: "A weekend building a project in a team; good for a portfolio.",
    goals: ["industry", "grad-school"],
    tags: ["software", "web", "ai"],
    relatedCourses: ["CSC 3350"],
    deadline: "2027-02-20",
  },
  {
    id: "ex-acm",
    category: "experience",
    kind: "club",
    title: "Computing club (ACM student chapter)",
    organization: "Student organization",
    description: "Tech talks, interview prep, and networking with alumni.",
    goals: ["industry", "grad-school"],
    tags: ["software", "ai", "theory"],
    relatedCourses: [],
  },
  {
    id: "ex-cloud-cert",
    category: "experience",
    kind: "certification",
    title: "Entry-level cloud certification",
    organization: "Industry certification",
    description: "Shows employers you can deploy and run software in the cloud.",
    goals: ["industry"],
    tags: ["systems", "software"],
    relatedCourses: ["CSC 4320", "CSC 4220"],
  },
  {
    id: "ex-security-cert",
    category: "experience",
    kind: "certification",
    title: "Entry-level security certification",
    organization: "Industry certification",
    description: "A common requirement for security analyst roles.",
    goals: ["industry"],
    tags: ["security"],
    relatedCourses: ["CSC 4222", "CSC 4220"],
  },
];
