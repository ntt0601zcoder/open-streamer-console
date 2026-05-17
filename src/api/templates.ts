import { api } from './client';
import type { DataResponse, ListResponse, Template, TemplateBody } from './types';

export const templatesApi = {
  list: () => api.get('templates').json<ListResponse<Template>>(),

  get: (code: string) => api.get(`templates/${code}`).json<DataResponse<Template>>(),

  // POST /templates/:code — create (201) or update (200). Body shape matches
  // the server's domain.Template (sans `code`, which is the path param).
  save: (code: string, body: TemplateBody) =>
    api.post(`templates/${code}`, { json: body }).json<DataResponse<Template>>(),

  // Server returns 409 when a stream still references the template.
  delete: (code: string) => api.delete(`templates/${code}`),
};
