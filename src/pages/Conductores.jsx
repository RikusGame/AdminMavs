import { useState, useEffect } from "react";
import { Search, Edit, Trash2, UserCircle, FileText } from "lucide-react"; 
import { db } from "../config/firebase";
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { storage } from "../config/firebase";
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { ConductorDocumentosModal } from "../modal/ConductorDocumentosModal";
import EditConductorModal from "../modal/EditConductorModal";
import DeleteAlert from "../components/DeleteAlert";


export function Conductores({ onSelectConductor }) {
  const [conductores, setConductores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conductorToEdit, setConductorToEdit] = useState(null);
  const [conductorToDelete, setConductorToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const taxistasCollectionRef = collection(db, "taxistas");

    const q = query(taxistasCollectionRef);

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const docsPromises = snapshot.docs.map(async (doc, index) => {
            const data = doc.data();
            
            // Solo procesar si es modo taxista
            if (data.modo !== 'taxista') {
              return null;
            }
            
            // Capturar fecha de registro del conductor desde perfilTaxista
            const fechaRegistro = data.fechaRegistro || data.perfilTaxista?.fechaRegistro;
            let createdAt = null;
            
            if (fechaRegistro) {
              // Si fechaRegistro existe, convertirlo a Date
              if (fechaRegistro.toDate) {
                // Es un Timestamp de Firestore
                createdAt = fechaRegistro.toDate().toISOString();
              } else if (typeof fechaRegistro === 'string') {
                createdAt = fechaRegistro;
              }
            }

            const perfil = data.perfilTaxista || {};
            const documentos = data.documentosVehiculo || {};

            // Debug: mostrar todos los campos posibles de foto
            if (!perfil.FotoPerfil && !perfil.fotoPerfil && !data.fotoPerfil && !data.photoURL) {
              console.log(`🔍 Campos disponibles para ${perfil.nombre || doc.id}:`, {
                'perfil.FotoPerfil': perfil.FotoPerfil,
                'perfil.fotoPerfil': perfil.fotoPerfil,
                'perfil.photoURL': perfil.photoURL,
                'data.fotoPerfil': data.fotoPerfil,
                'data.photoURL': data.photoURL,
                'data.fotoPerfilUrl': data.fotoPerfilUrl,
                'perfil completo': perfil
              });
            }

            // Prioridad: FotoPerfil > fotoPerfil > fotoPerfil del root > photoURL del provider > fotoPerfilUrl
            let foto = perfil.FotoPerfil || perfil.fotoPerfil || data.fotoPerfil || perfil.photoURL || data.photoURL || data.fotoPerfilUrl || "";

            console.log(`📸 Foto original para ${perfil.nombre || doc.id}:`, foto);

            // Si existe el campo pero no es una URL completa, intentar obtener downloadURL desde Storage
            if (foto && typeof foto === 'string' && !foto.startsWith('http')) {
              try {
                const url = await getDownloadURL(storageRef(storage, foto));
                console.log(`✅ URL resuelta desde Storage para ${perfil.nombre || doc.id}:`, url);
                foto = url;
              } catch (err) {
                console.warn(`⚠️ No se pudo resolver foto desde Storage para ${perfil.nombre || doc.id}:`, err.message || err);
              }
            }

            // Verificar documentos OBLIGATORIOS para conductores
            const documentosObligatorios = [
              'fotoCarneIdentidadAnverso',
              'fotoCarneIdentidadReverso', 
              'fotoLicenciaConducirAnverso',
              'fotoLicenciaConducirReverso',
              'fotoConductor'
            ];
            
            // Debe tener al menos los 5 documentos obligatorios
            const tieneDocumentos = documentosObligatorios.every(campo => 
              documentos[campo] && documentos[campo].trim() !== ''
            );

            return {
              id: doc.id,
              nombre: perfil.nombre || "N/A",
              email: perfil.correo || "N/A",
              telefono: perfil.telefono || "N/A",
              fotoPerfilUrl: foto || "",
              documentos: documentos,
              habilitado: documentos.habilitado || false,
              tieneDocumentos: tieneDocumentos,
              createdAt: createdAt,
            };
          });

          const taxistasData = (await Promise.all(docsPromises))
            .filter(conductor => {
              if (!conductor) return false; // Filtrar nulls (no taxistas)
              const tieneNombre = conductor.nombre && conductor.nombre !== "N/A" && conductor.nombre.trim() !== "";
              const tieneCorreo = conductor.email && conductor.email !== "N/A" && conductor.email !== "Correo No Disponible" && conductor.email.trim() !== "";
              const tieneDocumentos = conductor.tieneDocumentos; // Solo mostrar si tiene documentos
              return tieneNombre && tieneCorreo && tieneDocumentos;
            })
            .sort((a, b) => {
              // Ordenar por fecha de registro descendente (más recientes arriba)
              const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
              const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
              return dateB - dateA;
            });

          console.log(`✅ ${taxistasData.length} conductores cargados (filtrados por nombre y correo válidos)`);
          console.log('🔍 ORDENAMIENTO - Primeros 5 conductores:', taxistasData.slice(0, 5).map(c => ({
            nombre: c.nombre,
            email: c.email,
            createdAt: c.createdAt
          })));
          setConductores(taxistasData);
          setLoading(false);
        } catch (err) {
          console.error('❌ Error procesando snapshots de taxistas:', err);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error al obtener los datos de taxistas:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const openDocumentsModal = (conductor) => {
    const conductorCompleto = {
      id: conductor.id,
      perfilTaxista: {
        nombre: conductor.nombre,
        correo: conductor.email,
        telefono: conductor.telefono
      },
      documentosVehiculo: conductor.documentos
    };
    setSelectedConductor(conductorCompleto);
    setIsModalOpen(true);
  };

  const closeDocumentsModal = () => {
    setIsModalOpen(false);
    setSelectedConductor(null);
  };

  const openEditModal = (conductor) => {
    setConductorToEdit(conductor);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setConductorToEdit(null);
  };

  const openDeleteModal = (conductor) => {
    setConductorToDelete(conductor);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setConductorToDelete(null);
  };

  const handleDeleteConductor = async () => {
    if (!conductorToDelete) return;
    
    setIsDeleting(true);
    try {
      const conductorRef = doc(db, "taxistas", conductorToDelete.id);
      await deleteDoc(conductorRef);
      closeDeleteModal();
    } catch (error) {
      console.error("Error al eliminar conductor:", error);
      alert("Error al eliminar el conductor");
    }
    setIsDeleting(false);
  };

  const handleSaveEdit = () => {
    // La actualización se maneja en el modal
    closeEditModal();
  };

  const toggleHabilitado = async (conductorId, currentState) => {
    try {
      const conductorRef = doc(db, "taxistas", conductorId);
      await updateDoc(conductorRef, {
        "documentosVehiculo.habilitado": !currentState
      });
    } catch (error) {
      console.error("Error al actualizar estado del conductor:", error);
    }
  };

  const aprobarTodos = async () => {
    setIsApproving(true);
    try {
      // Primero obtener la configuración de documentos
      const configDoc = await getDoc(doc(db, 'configuracion', 'documentos'));
      const documentMap = configDoc.exists() 
        ? configDoc.data().documentMap 
        : {
            fotoConductor: { label: "Foto del Conductor", requerido: true },
            fotoLicenciaConducirAnverso: { label: "Licencia de Conducir (Anverso)", requerido: true },
            fotoLicenciaConducirReverso: { label: "Licencia de Conducir (Reverso)", requerido: true },
            fotoSoat: { label: "SOAT", requerido: true },
            fotoPermisoCirculacion: { label: "Permiso de Circulación", requerido: false },
            fotoRevisionTecnica: { label: "Revisión Técnica", requerido: true },
            fotoCarneIdentidadAnverso: { label: "Carné de Identidad (Anverso)", requerido: true },
            fotoCarneIdentidadReverso: { label: "Carné de Identidad (Reverso)", requerido: true },
            fotoAntecedentesPenales: { label: "Antecedentes Penales", requerido: true },
            fotoVehiculo1: { label: "Foto del Vehículo 1", requerido: true },
            fotoVehiculo2: { label: "Foto del Vehículo 2", requerido: true }
          };

      const documentFields = Object.keys(documentMap);

      const updates = conductores.map(conductor => {
        // Preparar las actualizaciones para este conductor
        const updateData = {
          "documentosVehiculo.habilitado": true,
          "estado": "Aprobado"
        };
        
        // Marcar TODOS los documentos como verificados
        documentFields.forEach(field => {
          const capitalizedKey = field.charAt(0).toUpperCase() + field.slice(1);
          const verificadoKey = `verificado${capitalizedKey}`;
          updateData[`documentosVehiculo.${verificadoKey}`] = true;
        });

        console.log('Actualizando conductor:', conductor.id, updateData);
        return updateDoc(doc(db, "taxistas", conductor.id), updateData);
      });

      await Promise.all(updates);
      console.log('✅ Todos los conductores aprobados y documentos verificados');
    } catch (error) {
      console.error("Error al aprobar todos los conductores:", error);
    } finally {
      setIsApproving(false);
      setIsApproveAllModalOpen(false);
    }
  };

  const handleApproveAllClick = () => {
    setIsApproveAllModalOpen(true);
  };
  
  const filteredConductores = conductores.filter(
    (conductor) => {
      const matchesSearch = conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conductor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           conductor.telefono.includes(searchTerm);
      
      const matchesStatus = statusFilter === "todos" ||
                           (statusFilter === "aprobados" && conductor.habilitado) ||
                           (statusFilter === "pendientes" && !conductor.habilitado);
      
      return matchesSearch && matchesStatus;
    }
  );

  if (loading && conductores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <img src="public/images/spinner.gif" alt="Cargando..." className="w-10" />
        <a className="text-black-600">Cargando datos de conductores...</a>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1>Conductores</h1>
            <p className="text-sm text-gray-500">Gestión y administración de conductores</p>
          </div>
          <div className="text-sm text-gray-500">
            Panel de Control {'>'} Conductores
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl mb-1">{conductores.length}</div>
          <div className="text-sm text-gray-500">Total Conductores</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl text-blue-600 mb-1">{filteredConductores.length}</div>
          <div className="text-sm text-gray-500">Resultados</div>
        </div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Nombre</th>
                <th className="text-left py-3 px-4">Correo</th>
                <th className="text-left py-3 px-4">Teléfono</th>
                {/*<th className="text-left py-3 px-4">Estado</th>*/}
                <th className="text-left py-3 px-4">Docs</th> 
                <th className="text-left py-3 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredConductores.map((conductor) => (
                <tr key={conductor.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3 cursor-pointer hover:text-blue-600 transition" onClick={() => onSelectConductor(conductor.id)}>
                      {conductor.fotoPerfilUrl && conductor.fotoPerfilUrl.trim() !== '' ? (
                        <img
                          src={conductor.fotoPerfilUrl}
                          alt={`Foto de ${conductor.nombre}`}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target;
                            target.style.display = "none";
                            const placeholder = target.nextElementSibling;
                            if (placeholder) placeholder.style.display = "flex";
                          }}
                        />
                      ) : null}
                      {!conductor.fotoPerfilUrl || conductor.fotoPerfilUrl.trim() === '' ? (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center" style={{ display: 'none' }}>
                          <UserCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <span className="font-medium hover:underline">{conductor.nombre}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-green-700">{conductor.email}</td>
                  <td className="py-3 px-4 text-sm">{conductor.telefono}</td>
                  
                  <td className="py-3 px-4">
                    <button
                      onClick={() => openDocumentsModal(conductor)}
                      className="text-gray-500 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition duration-150"
                      title="Ver Documentos"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                     
                      <button 
                        onClick={() => openDeleteModal(conductor)}
                        className="text-red-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition duration-150"
                        title="Eliminar Conductor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {isModalOpen && selectedConductor && (
        <ConductorDocumentosModal
          conductor={selectedConductor}
          onClose={closeDocumentsModal}
        />
      )}
      
      {isEditModalOpen && conductorToEdit && (
        <EditConductorModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          conductor={conductorToEdit}
          onSave={handleSaveEdit}
        />
      )}
      
      {isDeleteModalOpen && conductorToDelete && (
        <DeleteAlert
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteConductor}
          itemName={conductorToDelete.nombre}
          itemType="el conductor"
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}