import { apiUrl } from '../lib/api';

function authHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const recoveryMessagesService = {
  async obtener(token) {
    const res = await fetch(apiUrl('/api/settings/recovery-messages'), {
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  },

  async guardar(token, messages) {
    const res = await fetch(apiUrl('/api/settings/recovery-messages'), {
      method: 'PUT',
      headers: authHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ messages })
    });
    return parse(res);
  },

  async restablecer(token) {
    const res = await fetch(apiUrl('/api/settings/recovery-messages/reset'), {
      method: 'POST',
      headers: authHeaders(token),
      credentials: 'include'
    });
    return parse(res);
  }
};

export default recoveryMessagesService;
