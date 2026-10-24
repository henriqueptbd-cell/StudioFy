import { api } from '@/services/api';
import { CreateTeamMemberPayload, TeamMember, UpdateTeamMemberPayload } from '@/types';

/** Lista os membros da equipe do tenant autenticado. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await api.get('/admin/team');
  return res.data.data;
}

/** Cadastra um novo membro (requer token de ADMIN). */
export async function createTeamMember(payload: CreateTeamMemberPayload): Promise<TeamMember> {
  const res = await api.post('/admin/team', payload);
  return res.data.data;
}

/** Atualiza nome, papel, status ou senha de um membro (requer ADMIN). */
export async function updateTeamMember(
  id: string,
  payload: UpdateTeamMemberPayload,
): Promise<TeamMember> {
  const res = await api.patch(`/admin/team/${id}`, payload);
  return res.data.data;
}
