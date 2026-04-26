import api from './api'

export const iaService = {
  analizar: (emailText) => api.post('/ia/analizar', { emailText }),
}
