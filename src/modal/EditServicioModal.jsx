import { useState, useEffect } from "react";
import { db, storage } from "../config/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { X, Upload, Trash2, Plus, Minus, CheckCircle } from "lucide-react";

export function EditServicioModal({ servicio, onClose }) {
  const [cargando, setCargando] = useState(false);
  const [nombre, setNombre] = useState(servicio.nombre || "");
  const [activo, setActivo] = useState(servicio.activo);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(servicio.logo || "");
  const [logoOriginal, setLogoOriginal] = useState(servicio.logo || "");
  const [mostrarExito, setMostrarExito] = useState(false);
  const [resultadoActualizacion, setResultadoActualizacion] = useState(null);

  // Tarifas
  const [tarifaBase, setTarifaBase] = useState(servicio.tarifas?.tarifaBase?.toString() || "0.00");
  const [distanciaBase, setDistanciaBase] = useState(servicio.tarifas?.distanciaBase?.toString() || "0.00");
  const [porKm, setPorKm] = useState(servicio.tarifas?.porKm?.toString() || "0.00");
  const [porMin, setPorMin] = useState(servicio.tarifas?.porMin?.toString() || "0.00");
  const [horaPicoExtra, setHoraPicoExtra] = useState(servicio.tarifas?.horaPicoExtra?.toString() || "0.00");
  const [nocturno, setNocturno] = useState(servicio.tarifas?.nocturno?.toString() || "0.00");
  const [comision, setComision] = useState(servicio.tarifas?.comision?.toString() || "0.00");

  // Tarifas Aeropuerto
  const [tramosAeropuerto, setTramosAeropuerto] = useState(
    servicio.tarifasAeropuerto?.tramos?.map(t => ({
      desdeKm: t.desdeKm?.toString() || "",
      precio: t.precio?.toString() || ""
    })) || [
      { desdeKm: "10", precio: "40.00" },
      { desdeKm: "20", precio: "60.00" },
      { desdeKm: "30", precio: "80.00" },
    ]
  );

  // Horas Pico
  const [franjasHorasPico, setFranjasHorasPico] = useState(
    servicio.horasPico?.franjas?.map(f => ({
      desde: f.desde || "",
      hasta: f.hasta || ""
    })) || [
      { desde: "07:00", hasta: "09:00" },
      { desde: "12:00", hasta: "14:00" },
      { desde: "18:00", hasta: "20:00" },
    ]
  );

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const eliminarLogo = () => {
    setLogo(null);
    setLogoPreview("");
  };

  const agregarTramoAeropuerto = () => {
    setTramosAeropuerto([...tramosAeropuerto, { desdeKm: "", precio: "" }]);
  };

  const eliminarTramoAeropuerto = (index) => {
    setTramosAeropuerto(tramosAeropuerto.filter((_, i) => i !== index));
  };

  const actualizarTramoAeropuerto = (index, field, value) => {
    const nuevos = [...tramosAeropuerto];
    nuevos[index][field] = value;
    setTramosAeropuerto(nuevos);
  };

  const agregarFranjaHoraPico = () => {
    setFranjasHorasPico([...franjasHorasPico, { desde: "", hasta: "" }]);
  };

  const eliminarFranjaHoraPico = (index) => {
    setFranjasHorasPico(franjasHorasPico.filter((_, i) => i !== index));
  };

  const actualizarFranjaHoraPico = (index, field, value) => {
    const nuevas = [...franjasHorasPico];
    nuevas[index][field] = value;
    setFranjasHorasPico(nuevas);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);

    try {
      let logoUrl = logoOriginal;

      // Si hay nuevo logo, subirlo
      if (logo) {
        // Eliminar logo anterior si existe
        if (logoOriginal) {
          try {
            const oldLogoRef = ref(storage, logoOriginal);
            await deleteObject(oldLogoRef);
          } catch (error) {
            console.warn("No se pudo eliminar logo anterior:", error);
          }
        }

        // Subir nuevo logo
        const timestamp = Date.now();
        const logoRef = ref(
          storage,
          `empresas/mujeresalvolante/tarifas/logo_${servicio.nombre}_${timestamp}`
        );
        await uploadBytes(logoRef, logo);
        logoUrl = await getDownloadURL(logoRef);
      } else if (!logoPreview && logoOriginal) {
        // Si se eliminó el logo
        try {
          const oldLogoRef = ref(storage, logoOriginal);
          await deleteObject(oldLogoRef);
        } catch (error) {
          console.warn("No se pudo eliminar logo:", error);
        }
        logoUrl = "";
      }

      // Preparar datos actualizados
      const servicioData = {
        servicio: nombre,
        activo: activo,
        logo: logoUrl,
        icono: servicio.icono || "local_taxi",
        tarifas: {
          tarifaBase: parseFloat(tarifaBase) || 0,
          distanciaBase: parseFloat(distanciaBase) || 0,
          porKm: parseFloat(porKm) || 0,
          porMin: parseFloat(porMin) || 0,
          horaPicoExtra: parseFloat(horaPicoExtra) || 0,
          nocturno: parseFloat(nocturno) || 0,
          comision: parseFloat(comision) || 0,
        },
        Tarifas_Aeropuerto: {
          tramos: tramosAeropuerto.map(t => ({
            desdeKm: t.desdeKm,
            precio: parseFloat(t.precio) || 0,
          }))
        },
        Horas_pico: {
          franjas: franjasHorasPico.map(f => ({
            desde: f.desde,
            hasta: f.hasta,
          }))
        }
      };

      // Actualizar en Firestore (solo este departamento con tarifas completas)
      const docRef = doc(db, "empresas", "mujeresalvolante", "tarifas", servicio.departamento);
      await updateDoc(docRef, {
        [servicio.servicioKey]: servicioData
      });
      console.log(`✅ Actualizado departamento actual: ${servicio.departamento}`);

      // Lista de departamentos
      const departamentos = ["Cochabamba", "La Paz", "Santa Cruz", "Chuquisaca", "Oruro", "Potosí", "Tarija", "Pando", "Beni"];
      
      // Actualizar nombre y logo en todos los otros departamentos en paralelo
      const promesas = departamentos
        .filter(dept => dept !== servicio.departamento)
        .map(async (dept) => {
          try {
            const deptDocRef = doc(db, "empresas", "mujeresalvolante", "tarifas", dept);
            const deptSnap = await getDoc(deptDocRef);
            
            if (deptSnap.exists()) {
              const data = deptSnap.data();
              
              // Solo actualizar si el servicio existe
              if (data[servicio.servicioKey]) {
                const updates = {};
                
                // Actualizar nombre si cambió
                if (nombre !== servicio.nombre) {
                  updates[`${servicio.servicioKey}.servicio`] = nombre;
                }
                
                // Actualizar logo
                updates[`${servicio.servicioKey}.logo`] = logoUrl;
                
                if (Object.keys(updates).length > 0) {
                  await updateDoc(deptDocRef, updates);
                  console.log(`✅ Actualizado: ${dept}`);
                  return { dept, success: true };
                }
              } else {
                console.log(`⚠️ Servicio no existe en: ${dept}`);
                return { dept, success: false, reason: 'no existe' };
              }
            } else {
              console.log(`⚠️ Documento no existe: ${dept}`);
              return { dept, success: false, reason: 'documento no existe' };
            }
          } catch (error) {
            console.error(`❌ Error en ${dept}:`, error);
            return { dept, success: false, error: error.message };
          }
        });

      const resultados = await Promise.all(promesas);
      const exitosos = resultados.filter(r => r && r.success).length;
      console.log(`📊 Resumen: ${exitosos}/${departamentos.length - 1} departamentos actualizados`);

      // Mostrar modal de éxito personalizado
      setResultadoActualizacion({
        total: exitosos + 1,
        nombre: nombre
      });
      setMostrarExito(true);
      
      // Cerrar después de 2 segundos
      setTimeout(() => {
        setMostrarExito(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error al actualizar servicio:", error);
      alert("Error al actualizar el servicio");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      {/* Modal de Éxito */}
      {mostrarExito && resultadoActualizacion && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform animate-bounce-in">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                ¡Actualización Exitosa!
              </h3>
              <p className="text-gray-600 mb-4">
                El servicio <span className="font-bold text-green-600">"{resultadoActualizacion.nombre}"</span> ha sido actualizado
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-lg font-semibold text-green-700">
                  {resultadoActualizacion.total} departamentos actualizados
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Los cambios se reflejarán en toda la plataforma
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Configurar Tarifas - {servicio.nombre}</h2>
            <p className="text-sm text-gray-600">Departamento: {servicio.departamento}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre del Servicio - DESTACADO */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <label className="text-lg font-bold text-gray-800">
                Nombre del Servicio
              </label>
            </div>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Mujeres Al Volante"
              className="w-full px-4 py-3 text-lg border-2 border-green-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-600 font-medium"
              required
            />
            <p className="text-sm text-gray-600 mt-2">
              💡 Este nombre se actualizará en <strong>todos los departamentos</strong>
            </p>
          </div>

          {/* Nota informativa */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Configuración por departamento:</strong> Estas tarifas aplican solo para {servicio.departamento}. Para editar otro departamento, selecciónalo desde la lista principal.
            </p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo del Servicio (Compartido en todos los departamentos)
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-cover rounded-lg shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={eliminarLogo}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-gray-400" />
                </label>
              )}
              <div className="text-sm text-gray-500">
                <p>Cambia la imagen del servicio</p>
                <p className="text-xs">Formatos: JPG, PNG (máx. 2MB)</p>
              </div>
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="activo"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5 text-green-500 rounded focus:ring-green-500"
            />
            <label htmlFor="activo" className="text-sm font-medium text-gray-700">
              Servicio activo
            </label>
          </div>

          {/* Tarifas */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tarifas Base</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarifa Base (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tarifaBase}
                  onChange={(e) => setTarifaBase(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distancia Base (km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={distanciaBase}
                  onChange={(e) => setDistanciaBase(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Por Km (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={porKm}
                  onChange={(e) => setPorKm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Por Min (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={porMin}
                  onChange={(e) => setPorMin(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora Pico Extra (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={horaPicoExtra}
                  onChange={(e) => setHoraPicoExtra(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nocturno (Bs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nocturno}
                  onChange={(e) => setNocturno(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comisión (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={comision}
                  onChange={(e) => setComision(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Tarifas Aeropuerto */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Tarifas Aeropuerto</h3>
              <button
                type="button"
                onClick={agregarTramoAeropuerto}
                className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Tramo
              </button>
            </div>
            <div className="space-y-2">
              {tramosAeropuerto.map((tramo, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Desde (km)"
                    value={tramo.desdeKm}
                    onChange={(e) => actualizarTramoAeropuerto(index, 'desdeKm', e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio (Bs.)"
                    value={tramo.precio}
                    onChange={(e) => actualizarTramoAeropuerto(index, 'precio', e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarTramoAeropuerto(index)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Horas Pico */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Horas Pico</h3>
              <button
                type="button"
                onClick={agregarFranjaHoraPico}
                className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Franja
              </button>
            </div>
            <div className="space-y-2">
              {franjasHorasPico.map((franja, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={franja.desde}
                    onChange={(e) => actualizarFranjaHoraPico(index, 'desde', e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-gray-500">hasta</span>
                  <input
                    type="time"
                    value={franja.hasta}
                    onChange={(e) => actualizarFranjaHoraPico(index, 'hasta', e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarFranjaHoraPico(index)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
              disabled={cargando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              disabled={cargando}
            >
              {cargando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
