import api from './api'

export const serviciosService = {
  listar:    (params)   => api.get('/servicios', { params }),
  obtener:   (id)       => api.get(`/servicios/${id}`),
  crear:     (data)     => api.post('/servicios', data),
  actualizar:(id, data) => api.put(`/servicios/${id}`, data),
  eliminar:  (id)       => api.delete(`/servicios/${id}`),
}
