import { useState, useEffect } from "react";
import { db, storage } from "../config/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { X, Upload, Trash2, Plus, Minus } from "lucide-react";

export function EditServicioModal({ servicio, onClose }) {
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(servicio.activo);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(servicio.logo || "");
  const [logoOriginal, setLogoOriginal] = useState(servicio.logo || "");

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
        servicio: servicio.nombre,
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

      // Actualizar en Firestore (solo este departamento)
      const docRef = doc(db, "empresas", "mujeresalvolante", "tarifas", servicio.departamento);
      await updateDoc(docRef, {
        [servicio.servicioKey]: servicioData
      });

      // Si se cambió el logo, actualizar en todos los departamentos
      if (logo || (!logoPreview && logoOriginal)) {
        const departamentos = ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Oruro", "Potosí", "Tarija", "Pando", "Beni"];
        for (const dept of departamentos) {
          if (dept !== servicio.departamento) {
            try {
              const deptDocRef = doc(db, "empresas", "mujeresalvolante", "tarifas", dept);
              await updateDoc(deptDocRef, {
                [`${servicio.servicioKey}.logo`]: logoUrl
              });
            } catch (error) {
              console.warn(`No se pudo actualizar logo en ${dept}:`, error);
            }
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Error al actualizar servicio:", error);
      alert("Error al actualizar el servicio");
    } finally {
      setCargando(false);
    }
  };

  return (
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
  );
}
