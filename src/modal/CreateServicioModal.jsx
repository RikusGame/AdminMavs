import { useState } from "react";
import { db, storage } from "../config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { X, Upload, Trash2 } from "lucide-react";

export function CreateServicioModal({ onClose, onServicioCreado }) {
  const [cargando, setCargando] = useState(false);
  const [nombreServicio, setNombreServicio] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!nombreServicio.trim()) {
      alert("Por favor ingresa un nombre para el servicio");
      return;
    }

    setCargando(true);

    try {
      let logoUrl = "";

      // Subir logo si existe
      if (logo) {
        const timestamp = Date.now();
        const logoRef = ref(
          storage,
          `empresas/mujeresalvolante/servicios/logo_${nombreServicio}_${timestamp}`
        );
        await uploadBytes(logoRef, logo);
        logoUrl = await getDownloadURL(logoRef);
      }

      // Crear el key del servicio (normalizado)
      const servicioKey = nombreServicio.toLowerCase().trim().replace(/\s+/g, '_');

      // Crear el documento del servicio en la colección servicios_departamentos
      const servicioDocRef = doc(db, "servicios_departamentos", "servicios_departamentos");
      const servicioSnap = await getDoc(servicioDocRef);

      let serviciosActuales = [];
      if (servicioSnap.exists()) {
        serviciosActuales = servicioSnap.data().Servicios || [];
      }

      // Verificar si ya existe
      if (serviciosActuales.includes(nombreServicio)) {
        alert("Este servicio ya existe");
        setCargando(false);
        return;
      }

      // Agregar el nuevo servicio al catálogo
      serviciosActuales.push(nombreServicio);
      await setDoc(servicioDocRef, {
        Servicios: serviciosActuales,
        departamentos: ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Oruro", "Potosí", "Tarija", "Pando", "Beni"]
      }, { merge: true });

      // Crear estructura base en cada departamento
      const departamentos = ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Oruro", "Potosí", "Tarija", "Pando", "Beni"];
      
      for (const dept of departamentos) {
        const tarifaDocRef = doc(db, "empresas", "mujeresalvolante", "tarifas", dept);
        const tarifaSnap = await getDoc(tarifaDocRef);

        const servicioBase = {
          servicio: nombreServicio,
          activo: false, // Por defecto inactivo hasta que se configure
          logo: logoUrl,
          icono: "local_taxi",
          tarifas: {
            tarifaBase: 0,
            distanciaBase: 0,
            porKm: 0,
            porMin: 0,
            horaPicoExtra: 0,
            nocturno: 0,
            comision: 0,
          },
          Tarifas_Aeropuerto: {
            tramos: []
          },
          Horas_pico: {
            franjas: []
          }
        };

        if (tarifaSnap.exists()) {
          // Agregar el servicio al documento existente
          await setDoc(tarifaDocRef, {
            [servicioKey]: servicioBase
          }, { merge: true });
        } else {
          // Crear nuevo documento
          await setDoc(tarifaDocRef, {
            [servicioKey]: servicioBase
          });
        }
      }

      // Llamar callback con el servicio creado para abrir edición
      if (onServicioCreado) {
        onServicioCreado({
          nombre: nombreServicio,
          servicioKey: servicioKey,
          departamento: "La Paz", // Abrir edición del primer departamento
          logo: logoUrl
        });
      }

      onClose();
    } catch (error) {
      console.error("Error al crear servicio:", error);
      alert("Error al crear el servicio: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Crear Nuevo Servicio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre del Servicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Servicio *
            </label>
            <input
              type="text"
              value={nombreServicio}
              onChange={(e) => setNombreServicio(e.target.value)}
              placeholder="Ej: Mujeres Al Volante"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Este nombre aparecerá en la app móvil
            </p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo del Servicio (Opcional)
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 object-cover rounded-lg shadow-sm border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={eliminarLogo}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition">
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
                <p>Sube una imagen para el servicio</p>
                <p className="text-xs">JPG, PNG (máx. 2MB)</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Después de crear el servicio, podrás configurar las tarifas, horarios pico y demás detalles para cada departamento.
            </p>
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
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={cargando}
            >
              {cargando ? "Creando..." : "Crear Servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
