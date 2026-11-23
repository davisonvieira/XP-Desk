import type { Board } from './board';

export interface Project {
  id: string;
  name: string;
  description: string;
  members: string[];
  board: Board;
}

/** Papel do usuário logado dentro de um projeto. */
export type ProjectRole = 'owner' | 'member';

export interface ProjectMember {
  id: string;
  username: string;
  role: ProjectRole;
}

/** Resumo de projeto usado no dashboard (lista vinda de /api/v1/projects). */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  role: ProjectRole;
  archived: boolean;
  /** ISO 8601 — última atualização/acesso do projeto. */
  updatedAt: string;
  /** ISO 8601 — preenchido quando o projeto está arquivado. */
  archivedAt?: string;
  color?: ProjectColor;
  members: ProjectMember[];
}

export type ProjectColor = 'blue' | 'green' | 'yellow' | 'gray';
