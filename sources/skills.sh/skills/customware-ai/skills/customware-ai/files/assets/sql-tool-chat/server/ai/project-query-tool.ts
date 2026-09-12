import { tool } from "ai";
import {
  ListProjectsInputSchema,
  type ListProjectsInput,
  type ListProjectsOutput,
  type ProjectRow,
} from "../../shared/ai/project-tools.js";

const DEMO_PROJECTS: ProjectRow[] = [
  { id: "proj_01", name: "Support Inbox Refresh", status: "active", ownerName: "Asha" },
  { id: "proj_02", name: "Sales Insights", status: "paused", ownerName: "Mason" },
  { id: "proj_03", name: "Customer Health Feed", status: "active", ownerName: "Asha" },
  { id: "proj_04", name: "Billing Export", status: "draft", ownerName: "Noah" },
  { id: "proj_05", name: "Partner Portal Search", status: "active", ownerName: "Lina" },
];

function buildProjectListQuery(input: ListProjectsInput): { text: string; values: Array<string | number> } {
  const values: Array<string | number> = [];
  const conditions: string[] = [];

  if (input.query) {
    values.push(`%${input.query}%`);
    conditions.push(`(name ILIKE $${values.length} OR owner_name ILIKE $${values.length})`);
  }

  if (input.status) {
    values.push(input.status);
    conditions.push(`status = $${values.length}`);
  }

  values.push(input.limit);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return {
    text: `
SELECT id, name, status, owner_name
FROM projects
${whereClause}
ORDER BY name ASC
LIMIT $${values.length}
    `.trim(),
    values,
  };
}

async function listProjectsFromServer(input: ListProjectsInput): Promise<ListProjectsOutput> {
  const query = buildProjectListQuery(input);
  const normalizedQuery = input.query?.toLowerCase();

  // Replace this demo executor with the app's real read-only DB boundary.
  const rows = DEMO_PROJECTS.filter((project) => {
    if (input.status && project.status !== input.status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = `${project.name} ${project.ownerName}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  }).slice(0, input.limit);

  return {
    sql: query.text,
    params: query.values,
    rowCount: rows.length,
    rows,
  };
}

export function createProjectTools() {
  return {
    list_projects: tool({
      description:
        "Fetch a small read-only list of projects. Use this for project names, statuses, owners, and small filtered lookups.",
      inputSchema: ListProjectsInputSchema,
      async execute(input) {
        return await listProjectsFromServer(input);
      },
    }),
  };
}
