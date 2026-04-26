import api from './api'

export const presupuestosService = {
  listar:    (params)        => api.get('/presupuestos', { params }),
  obtener:   (id)            => api.get(`/presupuestos/${id}`),
  crear:     (data)          => api.post('/presupuestos', data),
  actualizar:(id, data)      => api.put(`/presupuestos/${id}`, data),
  cambiarEstado: (id, estado)=> api.patch(`/presupuestos/${id}/estado`, { estado }),
  eliminar:  (id)            => api.delete(`/presupuestos/${id}`),
  duplicar:  (id)            => api.post(`/presupuestos/${id}/duplicar`),
  descargarPDF: (id)         => api.get(`/presupuestos/${id}/pdf`, { responseType: 'blob', timeout: 120000 }),
  metricas:  ()              => api.get('/presupuestos/metricas'),
}
