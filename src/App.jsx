import { useState, useEffect } from 'react'
import './App.css'

// IMPORTANTE: Reemplaza esta URL con la URL de tu Web App de Google Apps Script
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_kUa_yjSukC8h1CuTyh0vBTw37q3ixujy6n4wvzs8WwHi6YRuhNcpC16mB-_Klv7DyQ/exec'

// Lista de técnicos - puedes modificar esto según tus necesidades
const TECNICOS = [
  'Johan Hurtado',
  'Ricardo Oyarzun',
  'José Mauricio',
  'Denys Marupa',
  'Pedro Sepulveda',
  'Giovanny Allilef',
  'Luis Boada',
  'Enyer Pozo',
  'Bastian Parada'
]

function App() {
  const [ordenTrabajo, setOrdenTrabajo] = useState('')
  const [tecnico, setTecnico] = useState('')
  const [fotos, setFotos] = useState([])
  const [ubicacion, setUbicacion] = useState(null)
  const [direccion, setDireccion] = useState('')
  const [cargandoUbicacion, setCargandoUbicacion] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' })

  useEffect(() => {
    obtenerUbicacion()
  }, [])

  const obtenerUbicacion = () => {
    setCargandoUbicacion(true)
    
    if (!navigator.geolocation) {
      setMensaje({ tipo: 'error', texto: 'Tu navegador no soporta geolocalización' })
      setCargandoUbicacion(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUbicacion({ lat: latitude, lng: longitude })
        
        // Obtener dirección usando geocodificación inversa
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es`
          )
          const data = await response.json()
          const direccionObtenida = data.display_name || `${latitude}, ${longitude}`
          setDireccion(direccionObtenida)
        } catch {
          setDireccion(`${latitude}, ${longitude}`)
        }
        
        setCargandoUbicacion(false)
      },
      () => {
        setMensaje({ tipo: 'error', texto: 'No se pudo obtener la ubicación' })
        setCargandoUbicacion(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  const handleFotoChange = async (e) => {
    const archivos = Array.from(e.target.files)
    
    for (const archivo of archivos) {
      if (archivo.type.startsWith('image/')) {
        const reader = new FileReader()
        
        reader.onload = async (evento) => {
          const img = new Image()
          img.src = evento.target.result
          
          img.onload = () => {
            // Crear canvas para agregar marca de agua
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            
            canvas.width = img.width
            canvas.height = img.height
            
            // Dibujar imagen
            ctx.drawImage(img, 0, 0)
            
            // Agregar marca de agua
            const textoMarcaAgua = `${direccion || 'Sin ubicación'}\nLat: ${ubicacion?.lat.toFixed(6) || 'N/A'}, Lng: ${ubicacion?.lng.toFixed(6) || 'N/A'}\n${new Date().toLocaleString('es-CL')}`
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
            ctx.fillRect(0, canvas.height - 120, canvas.width, 120)
            
            ctx.fillStyle = 'white'
            ctx.font = 'bold 24px Arial'
            
            const lineas = textoMarcaAgua.split('\n')
            lineas.forEach((linea, index) => {
              ctx.fillText(linea, 20, canvas.height - 90 + (index * 35))
            })
            
            // Convertir a base64
            const fotoConMarca = canvas.toDataURL('image/jpeg', 0.9)
            
            setFotos(prevFotos => [...prevFotos, {
              data: fotoConMarca,
              nombre: archivo.name
            }])
          }
        }
        
        reader.readAsDataURL(archivo)
      }
    }
  }

  const eliminarFoto = (index) => {
    setFotos(prevFotos => prevFotos.filter((_, i) => i !== index))
  }

  const validarFormulario = () => {
    if (!ordenTrabajo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa el número de orden de trabajo' })
      return false
    }
    
    if (!/^\d+$/.test(ordenTrabajo.trim())) {
      setMensaje({ tipo: 'error', texto: 'La orden de trabajo debe contener solo números' })
      return false
    }
    
    if (!tecnico) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un técnico' })
      return false
    }
    
    if (fotos.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Debes agregar al menos una foto' })
      return false
    }
    
    if (!ubicacion) {
      setMensaje({ tipo: 'error', texto: 'No se ha capturado la ubicación GPS' })
      return false
    }
    
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validarFormulario()) {
      return
    }
    
    setEnviando(true)
    setMensaje({ tipo: '', texto: '' })
    
    try {
      const datos = {
        ordenTrabajo: ordenTrabajo.trim(),
        tecnico,
        fotos: fotos.map(f => f.data),
        ubicacion,
        direccion,
        fecha: new Date().toISOString()
      }
      
      await fetch(APP_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
        mode: 'no-cors' // App Script requiere no-cors
      })
      
      // Con no-cors no podemos leer la respuesta, asumimos éxito
      setMensaje({ tipo: 'exito', texto: 'Registro enviado exitosamente' })
      
      // Limpiar formulario
      setOrdenTrabajo('')
      setTecnico('')
      setFotos([])
      obtenerUbicacion()
      
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Error al enviar el registro: ' + error.message })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Registro de Trabajo</h1>
        
        {mensaje.texto && (
          <div className={`mensaje ${mensaje.tipo}`}>
            {mensaje.texto}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ordenTrabajo">Orden de Trabajo *</label>
            <input
              type="text"
              id="ordenTrabajo"
              value={ordenTrabajo}
              onChange={(e) => setOrdenTrabajo(e.target.value)}
              placeholder="Solo números"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tecnico">Técnico *</label>
            <select
              id="tecnico"
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
            >
              <option value="">Selecciona un técnico</option>
              {TECNICOS.map((tec, index) => (
                <option key={index} value={tec}>{tec}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ubicación GPS</label>
            {cargandoUbicacion ? (
              <p className="ubicacion-info">Obteniendo ubicación...</p>
            ) : ubicacion ? (
              <div>
                <p className="ubicacion-info">
                  Lat: {ubicacion.lat.toFixed(6)}, Lng: {ubicacion.lng.toFixed(6)}
                </p>
                <button 
                  type="button" 
                  onClick={obtenerUbicacion}
                  className="btn-secundario"
                >
                  Actualizar Ubicación
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={obtenerUbicacion}
                className="btn-secundario"
              >
                Obtener Ubicación
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <textarea
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Edita la dirección si es necesario"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fotos">Fotos * (se agregará marca de agua)</label>
            <input
              type="file"
              id="fotos"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handleFotoChange}
            />
          </div>

          {fotos.length > 0 && (
            <div className="fotos-preview">
              <h3>Fotos capturadas ({fotos.length})</h3>
              <div className="fotos-grid">
                {fotos.map((foto, index) => (
                  <div key={index} className="foto-item">
                    <img src={foto.data} alt={`Foto ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => eliminarFoto(index)}
                      className="btn-eliminar"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-submit"
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar Registro'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App