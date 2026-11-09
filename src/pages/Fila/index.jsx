export default function Fila() {
  const filaUrl = import.meta.env.VITE_FILA_URL

  if (!filaUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-6">
        <div className="alert alert-info max-w-md">Fila não configurada na demo.</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src={filaUrl}
        title="Fila de atendimento"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="fullscreen"
      />
    </div>
  )
}
