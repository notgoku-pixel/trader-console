async function request(url, options) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export const api = {
  getSkills: () => request('/api/skills'),
  getStatus: () => request('/api/status'),
  runSkill: (payload) => request('/api/run', { method: 'POST', body: JSON.stringify(payload) }),
  getLog: (limit = 60) => request(`/api/log?limit=${limit}`),
  getLogEntry: (id) => request(`/api/log/${encodeURIComponent(id)}`),
  getFiles: () => request('/api/files'),
  getFile: (filePath) => request(`/api/file?path=${encodeURIComponent(filePath)}`),
  getConfig: () => request('/api/config'),
  saveConfig: (values) => request('/api/config', { method: 'PUT', body: JSON.stringify(values) }),
  getPipeline: () => request('/api/pipeline'),
  startPipeline: (options) => request('/api/pipeline/start', { method: 'POST', body: JSON.stringify(options) }),
  stopPipeline: () => request('/api/pipeline/stop', { method: 'POST', body: JSON.stringify({}) }),
};
