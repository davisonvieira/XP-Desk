import type {
  Project,
  ProjectColor,
  ProjectMember,
  ProjectRole,
  ProjectSummary,
} from '../types/project';
import { apiRequest } from './api';

const mockProjects: Project[] = [
  {
    id: 'projeto-demo',
    name: 'Projeto Demonstrativo',
    description: 'Estrutura inicial do Xp Desk.',
    members: ['visitante@kanban.local'],
    board: {
      id: 'board-demo',
      name: 'Kanban Sprint 1',
      columns: [
        {
          id: 'todo',
          name: 'A Fazer',
          tasks: [
            {
              id: 'task-1',
              title: 'Definir estrutura inicial',
              description: 'Organizar as pastas base do frontend.',
              status: 'todo',
            },
          ],
        },
        {
          id: 'in-progress',
          name: 'Em Andamento',
          tasks: [],
        },
        {
          id: 'done',
          name: 'Concluído',
          tasks: [],
        },
      ],
    },
  },
];

export function listProjects(): Project[] {
  return mockProjects;
}

export function getProjectById(projectId: string): Project | undefined {
  return mockProjects.find((project) => project.id === projectId);
}

/* ------------------------------------------------------------------ */
/* Dashboard: resumo de projetos (/api/v1/projects com X-User-Id)      */
/* ------------------------------------------------------------------ */


export type DataSource = 'api' | 'mock';

export interface ProjectSummaryResult {
  projects: ProjectSummary[];
  source: DataSource;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function mockTeam(currentUserId: string, currentUsername: string): ProjectMember[] {
  return [
    { id: currentUserId, username: currentUsername, role: 'owner' },
    { id: 'mock-ana', username: 'Ana Beatriz Lima', role: 'member' },
    { id: 'mock-carlos', username: 'Carlos Eduardo Souza', role: 'member' },
    { id: 'mock-julia', username: 'Júlia Martins', role: 'member' },
  ];
}

/** Dados simulados exibidos enquanto a API não responde. */
export function buildMockProjectSummaries(userId: string, username: string): ProjectSummary[] {
  const team = mockTeam(userId, username);
  const asMember = (owner: ProjectMember): ProjectMember[] => [
    owner,
    { id: userId, username, role: 'member' },
  ];
  const ana = team[1];
  const carlos = team[2];

  return [
    { id: 'site-institucional', name: 'Site institucional', description: '', role: 'owner', archived: false, updatedAt: daysAgo(2), color: 'blue', members: team },
    { id: 'app-entregas', name: 'App de entregas', description: '', role: 'owner', archived: false, updatedAt: daysAgo(5), color: 'green', members: team.slice(0, 3) },
    { id: 'planejamento-semestre', name: 'Planejamento do semestre', description: '', role: 'member', archived: false, updatedAt: daysAgo(7), color: 'yellow', members: asMember({ ...ana, role: 'owner' }) },
    { id: 'blog-equipe', name: 'Blog da equipe', description: '', role: 'owner', archived: false, updatedAt: daysAgo(12), color: 'blue', members: team.slice(0, 2) },
    { id: 'pesquisa-usuarios', name: 'Pesquisa com usuários', description: '', role: 'owner', archived: false, updatedAt: daysAgo(16), color: 'green', members: team.slice(0, 2) },
    { id: 'eventos-2026', name: 'Eventos 2026', description: '', role: 'member', archived: false, updatedAt: daysAgo(20), color: 'yellow', members: asMember({ ...carlos, role: 'owner' }) },
    { id: 'campanha-matricula', name: 'Campanha de matrícula', description: '', role: 'owner', archived: true, updatedAt: daysAgo(21), archivedAt: daysAgo(21), color: 'gray', members: team.slice(0, 2) },
    { id: 'prototipo-aplicativo', name: 'Protótipo do aplicativo', description: '', role: 'owner', archived: true, updatedAt: daysAgo(32), archivedAt: daysAgo(32), color: 'gray', members: team.slice(0, 3) },
  ];
}

/* ---------- Normalização da resposta da API (tolerante ao formato) ---------- */

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload)) {
    for (const key of ['data', 'content', 'items', 'projects']) {
      if (Array.isArray(payload[key])) return payload[key] as unknown[];
    }
  }
  throw new Error('Formato inesperado na lista de projetos.');
}

function normalizeRole(value: unknown): ProjectRole | undefined {
  const role = asString(value).toLowerCase();
  if (role === 'owner' || role === 'proprietario' || role === 'proprietário') return 'owner';
  if (role === 'member' || role === 'membro') return 'member';
  return undefined;
}

function normalizeMember(raw: unknown, ownerId: string): ProjectMember | null {
  if (typeof raw === 'string') return { id: raw, username: raw, role: raw === ownerId ? 'owner' : 'member' };
  if (!isRecord(raw)) return null;
  const user = isRecord(raw.user) ? raw.user : raw;
  const id = asString(user.id ?? raw.userId);
  const username = asString(user.username ?? user.name ?? user.email, id);
  const role = normalizeRole(raw.role) ?? (id === ownerId ? 'owner' : 'member');
  return id ? { id, username, role } : null;
}

const COLORS: ProjectColor[] = ['blue', 'green', 'yellow'];

function normalizeProject(raw: unknown, index: number, userId: string): ProjectSummary | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;

  const ownerId = asString(raw.ownerId ?? (isRecord(raw.owner) ? raw.owner.id : undefined));
  const status = asString(raw.status).toLowerCase();
  const archived = raw.archived === true || status === 'archived' || status === 'arquivado';
  const role = normalizeRole(raw.role) ?? (ownerId && ownerId === userId ? 'owner' : 'member');
  const members = Array.isArray(raw.members)
    ? raw.members.map((member) => normalizeMember(member, ownerId)).filter((m): m is ProjectMember => m !== null)
    : [];

  return {
    id,
    name: asString(raw.name ?? raw.title, 'Projeto sem nome'),
    description: asString(raw.description),
    role,
    archived,
    updatedAt: asString(raw.updatedAt ?? raw.lastAccessedAt ?? raw.createdAt, new Date().toISOString()),
    archivedAt: archived ? asString(raw.archivedAt ?? raw.updatedAt) || undefined : undefined,
    color: archived ? 'gray' : COLORS[index % COLORS.length],
    members,
  };
}

/** Busca os projetos do usuário na API; usa dados simulados se ela não responder. */
export async function fetchProjectSummaries(
  userId: string,
  username: string,
  signal?: AbortSignal,
): Promise<ProjectSummaryResult> {
  try {
    const payload = await apiRequest<unknown>('/projects', { userId, signal });
    const projects = unwrapList(payload)
      .map((raw, index) => normalizeProject(raw, index, userId))
      .filter((project): project is ProjectSummary => project !== null);
    return { projects, source: 'api' };
  } catch {
    return { projects: buildMockProjectSummaries(userId, username), source: 'mock' };
  }
}

/** Restaura (desarquiva) um projeto. Apenas o proprietário pode restaurar. */
export async function restoreProject(userId: string, projectId: string): Promise<void> {
  await apiRequest<unknown>(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    userId,
    body: { archived: false },
  });
}
