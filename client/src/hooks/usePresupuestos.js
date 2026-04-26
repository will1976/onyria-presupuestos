import { useState, useEffect, useCallback } from 'react'
import { presupuestosService } from '../services/presupuestos.service'

export function usePresupuestos(params = {}) {
  const [presupuestos, setPresupuestos] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await presupuestosService.listar(params)
      setPresupuestos(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetchAll() }, [fetchAll])

  const cambiarEstado = useCallback(async (id, estado) => {
    await presupuestosService.cambiarEstado(id, estado)
    setPresupuestos(prev =>
      prev.map(p => p.id === id ? { ...p, estado } : p)
    )
  }, [])

  const eliminar = useCallback(async (id) => {
    await presupuestosService.eliminar(id)
    setPresupuestos(prev => prev.filter(p => p.id !== id))
  }, [])

  return { presupuestos, loading, error, refetch: fetchAll, cambiarEstado, eliminar }
}
