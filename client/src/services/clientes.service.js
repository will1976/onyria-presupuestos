import api from './api'

export const clientesService = {
  listar:    (params)   => api.get('/clientes', { params }),
  obtener:   (id)       => api.get(`/clientes/${id}`),
  crear:     (data)     => api.post('/clientes', data),
  actualizar:(id, data) => api.put(`/clientes/${id}`, data),
  eliminar:  (id)       => api.delete(`/clientes/${id}`),
  presupuestosPorCliente: (id) => api.get(`/clientes/${id}/presupuestos`),
}
