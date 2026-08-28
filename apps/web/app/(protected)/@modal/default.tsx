// Requerido por Next.js Parallel Routes: qué renderizar en el slot @modal
// cuando la URL activa no matchea ninguna ruta interceptora (o sea, casi
// siempre -- el modal solo aparece cuando se navega a /transactions/new
// desde adentro de la app).
export default function Default() {
  return null
}
