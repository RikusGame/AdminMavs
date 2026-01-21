/**
 * GestionDocumentos - Página para gestionar configuración de documentos
 * Interfaz visual que replica el Stepper de Flutter con drag-and-drop
 */

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, Edit2, Trash2, Download, Upload, Eye, EyeOff, 
  FileText, AlertTriangle, CheckCircle, GripVertical, RefreshCw, 
  Power, Image, Type, Hash, List, ArrowUp, ArrowDown, Shield, ShieldAlert, ShieldOff
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import DocumentoFormModal from '../modal/DocumentoFormModal';
import {
  cargarConfiguracion,
  createDocument,
  updateDocument,
  deleteDocument,
  restoreDocument,
  reorderDocuments,
  exportConfig,
  importConfig
} from '../components/DocumentConfigManager';

const CATEGORIAS = [
  { id: 1, nombre: 'Documentos Personales', paso: 1, color: 'emerald', icon: '👤' },
  { id: 2, nombre: 'Documentos Vehículo', paso: 2, color: 'green', icon: '🚗' },
  { id: 3, nombre: 'Fotografías Vehículo', paso: 3, color: 'teal', icon: '📸' }
];

// Componente para documento individual con drag and drop
function SortableDocumento({ doc, onEditar, onEliminar, onRestaurar, onToggleActivo, onCambiarRequerido, onMoverArriba, onMoverAbajo, esPrimero, esUltimo }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id, disabled: !doc.activo });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIconoTipo = (tipo) => {
    switch (tipo) {
      case 'foto': return <Image className="w-3.5 h-3.5" />;
      case 'texto': return <Type className="w-3.5 h-3.5" />;
      case 'numero': return <Hash className="w-3.5 h-3.5" />;
      case 'seleccion': return <List className="w-3.5 h-3.5" />;
      default: return <FileText className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group mb-3 bg-white border-2 rounded-xl transition-all duration-200 ${
        doc.activo
          ? isDragging
            ? 'border-emerald-400 shadow-2xl scale-105'
            : 'border-gray-200 hover:border-emerald-300 hover:shadow-lg'
          : 'border-red-200 bg-red-50/30 opacity-60'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag handle y controles de orden */}
          <div className="flex flex-col gap-1">
            {doc.activo && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-blue-500 transition-colors p-1"
                title="Arrastra para reordenar"
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}
            {/* Botones de orden manual */}
            {doc.activo && (
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => onMoverArriba(doc)}
                  disabled={esPrimero}
                  className={`p-1 rounded transition-colors ${
                    esPrimero 
                      ? 'text-gray-200 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Mover arriba"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onMoverAbajo(doc)}
                  disabled={esUltimo}
                  className={`p-1 rounded transition-colors ${
                    esUltimo 
                      ? 'text-gray-200 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  title="Mover abajo"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header con título y orden */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-base leading-tight mb-1">
                  {doc.nombre}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    {getIconoTipo(doc.tipo)}
                    {doc.tipo.charAt(0).toUpperCase() + doc.tipo.slice(1)}
                  </span>
                  <span>•</span>
                  <span className="font-mono font-semibold">#{doc.orden}</span>
                </div>
              </div>
              
              {/* Toggle activo/inactivo */}
              <button
                onClick={() => onToggleActivo(doc)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  doc.activo
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
                title={doc.activo ? 'Click para deshabilitar' : 'Click para habilitar'}
              >
                <Power className="w-3.5 h-3.5" />
                {doc.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>

            {/* Control de Obligatorio/Opcional/Sin restricción - Expandible */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-600 font-medium">Estado:</span>
              <div className="group relative inline-flex">
                {/* Estado actual visible */}
                <div className="relative">
                  {doc.requerido === true && (
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-all group-hover:shadow-lg">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Obligatorio
                    </div>
                  )}
                  {doc.requerido === false && (
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-all group-hover:shadow-lg">
                      <Shield className="w-3.5 h-3.5" />
                      Opcional
                    </div>
                  )}
                  {/*{doc.requerido === null && (
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 text-white shadow-md flex items-center gap-1.5 cursor-pointer transition-all group-hover:shadow-lg">
                      <ShieldOff className="w-3.5 h-3.5" />
                      Ninguno
                    </div>
                  )}*/}
                </div>
                
                {/* Opciones expandidas al hover */}
                <div className="absolute left-0 top-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex gap-1 z-10">
                  <button
                    onClick={() => onCambiarRequerido(doc, 'obligatorio')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      doc.requerido === true
                        ? 'bg-red-600 text-white shadow-lg scale-105'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 hover:shadow-md'
                    }`}
                    title="Documento obligatorio"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Obligatorio
                  </button>
                  <button
                    onClick={() => onCambiarRequerido(doc, 'opcional')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      doc.requerido === false
                        ? 'bg-emerald-600 text-white shadow-lg scale-105'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:shadow-md'
                    }`}
                    title="Documento opcional"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Opcional
                  </button>
                  {/*<button
                    onClick={() => onCambiarRequerido(doc, 'ninguno')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      doc.requerido === null
                        ? 'bg-slate-700 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md'
                    }`}
                    title="Sin restricción"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    Ninguno
                  </button>*/}
                </div>
              </div>
            </div>

            {/* Badges de información */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {doc.esBase && (
                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  🔒 BASE
                </span>
              )}
              
              {!doc.esBase && (
                <span className="px-2.5 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
                  ➕ ADICIONAL
                </span>
              )}
            </div>

            {/* Descripción */}
            {doc.descripcion && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2 italic">
                "{doc.descripcion}"
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {doc.activo ? (
                <>
                  <button
                    onClick={() => onEditar(doc)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => onEliminar(doc)}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onRestaurar(doc)}
                  className="w-full px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restaurar Documento
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GestionDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [documentoEditar, setDocumentoEditar] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentoEliminar, setDocumentoEliminar] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [procesandoMovimiento, setProcesandoMovimiento] = useState(false);
  
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  useEffect(() => {
    cargarDocumentos();
  }, []);
  
  const cargarDocumentos = async (mostrarLoading = true) => {
    if (mostrarLoading) {
      setLoading(true);
    }
    const result = await cargarConfiguracion();
    if (result.success) {
      setDocumentos(result.documentos);
    }
    if (mostrarLoading) {
      setLoading(false);
    }
  };
  
  const getDocumentosPorPaso = (paso) => {
    return documentos
      .filter(doc => doc.paso === paso && (mostrarEliminados ? true : doc.activo))
      .sort((a, b) => a.orden - b.orden);
  };
  
  const handleCrearDocumento = () => {
    setDocumentoEditar(null);
    setModalOpen(true);
  };
  
  const handleEditarDocumento = (doc) => {
    setDocumentoEditar(doc);
    setModalOpen(true);
  };
  
  const handleGuardarDocumento = async (documentoData) => {
    if (documentoEditar) {
      // Editar existente
      const result = await updateDocument(
        documentoEditar.id,
        documentoData,
        currentUser?.uid || 'admin',
        currentUser?.displayName || currentUser?.email || 'Administrador'
      );
      
      if (result.success) {
        await cargarDocumentos();
      }
    } else {
      // Crear nuevo
      const result = await createDocument(
        documentoData,
        currentUser?.uid || 'admin',
        currentUser?.displayName || currentUser?.email || 'Administrador'
      );
      
      if (result.success) {
        await cargarDocumentos();
      }
    }
  };
  
  const handleEliminarDocumento = (doc) => {
    setDocumentoEliminar(doc);
    setShowDeleteConfirm(true);
  };
  
  const confirmarEliminacion = async () => {
    if (!documentoEliminar) return;
    
    const result = await deleteDocument(
      documentoEliminar.id,
      currentUser?.uid || 'admin',
      currentUser?.displayName || currentUser?.email || 'Administrador'
    );
    
    if (result.success) {
      await cargarDocumentos();
      setShowDeleteConfirm(false);
      setDocumentoEliminar(null);
    }
  };
  
  const handleRestaurarDocumento = async (doc) => {
    // Actualización optimista inmediata
    setDocumentos(prevDocs =>
      prevDocs.map(d => d.id === doc.id ? { ...d, activo: true } : d)
    );
    
    // Sincronizar con Firestore en background
    const result = await restoreDocument(
      doc.id,
      currentUser?.uid || 'admin',
      currentUser?.displayName || currentUser?.email || 'Administrador'
    );
    
    if (!result.success) {
      // Si falla, revertir el cambio
      setDocumentos(prevDocs =>
        prevDocs.map(d => d.id === doc.id ? { ...d, activo: false } : d)
      );
    }
  };

  const handleToggleActivo = async (doc) => {
    const nuevoEstado = !doc.activo;
    
    // Actualización optimista inmediata
    setDocumentos(prevDocs =>
      prevDocs.map(d => d.id === doc.id ? { ...d, activo: nuevoEstado } : d)
    );
    
    // Sincronizar con Firestore en background
    const result = await updateDocument(
      doc.id,
      { activo: nuevoEstado },
      currentUser?.uid || 'admin',
      currentUser?.displayName || currentUser?.email || 'Administrador'
    );
    
    if (!result.success) {
      // Si falla, revertir el cambio
      setDocumentos(prevDocs =>
        prevDocs.map(d => d.id === doc.id ? { ...d, activo: !nuevoEstado } : d)
      );
    }
  };

  const handleCambiarRequerido = async (doc, tipo) => {
    let nuevoValor;
    if (tipo === 'obligatorio') {
      nuevoValor = true;
    } else if (tipo === 'opcional') {
      nuevoValor = false;
    } else {
      nuevoValor = null; // ninguno
    }
    
    const valorAnterior = doc.requerido;
    
    // Actualización optimista inmediata
    setDocumentos(prevDocs =>
      prevDocs.map(d => d.id === doc.id ? { ...d, requerido: nuevoValor } : d)
    );
    
    // Sincronizar con Firestore en background
    const result = await updateDocument(
      doc.id,
      { requerido: nuevoValor },
      currentUser?.uid || 'admin',
      currentUser?.displayName || currentUser?.email || 'Administrador'
    );
    
    if (!result.success) {
      // Si falla, revertir el cambio
      setDocumentos(prevDocs =>
        prevDocs.map(d => d.id === doc.id ? { ...d, requerido: valorAnterior } : d)
      );
    }
  };

  const handleMoverArriba = async (doc) => {
    if (procesandoMovimiento) return; // Evitar múltiples llamadas
    
    const docsDelPaso = documentos
      .filter(d => d.paso === doc.paso && d.activo)
      .sort((a, b) => a.orden - b.orden);
    
    const currentIndex = docsDelPaso.findIndex(d => d.id === doc.id);
    if (currentIndex <= 0) return; // Ya es el primero
    
    setProcesandoMovimiento(true);
    
    const docAnterior = docsDelPaso[currentIndex - 1];
    const ordenTemp = doc.orden;
    
    // Actualización optimista: cambiar el estado local inmediatamente
    setDocumentos(prevDocs => 
      prevDocs.map(d => {
        if (d.id === doc.id) return { ...d, orden: docAnterior.orden };
        if (d.id === docAnterior.id) return { ...d, orden: ordenTemp };
        return d;
      })
    );
    
    // Actualizar en Firestore en paralelo
    try {
      await Promise.all([
        updateDocument(
          doc.id,
          { orden: docAnterior.orden },
          currentUser?.uid || 'admin',
          currentUser?.displayName || currentUser?.email || 'Administrador'
        ),
        updateDocument(
          docAnterior.id,
          { orden: ordenTemp },
          currentUser?.uid || 'admin',
          currentUser?.displayName || currentUser?.email || 'Administrador'
        )
      ]);
    } catch (error) {
      console.error('Error al mover documento:', error);
      // Si falla, recargar desde Firestore sin loading
      await cargarDocumentos(false);
    } finally {
      setProcesandoMovimiento(false);
    }
  };

  const handleMoverAbajo = async (doc) => {
    if (procesandoMovimiento) return; // Evitar múltiples llamadas
    
    const docsDelPaso = documentos
      .filter(d => d.paso === doc.paso && d.activo)
      .sort((a, b) => a.orden - b.orden);
    
    const currentIndex = docsDelPaso.findIndex(d => d.id === doc.id);
    if (currentIndex >= docsDelPaso.length - 1) return; // Ya es el último
    
    setProcesandoMovimiento(true);
    
    const docSiguiente = docsDelPaso[currentIndex + 1];
    const ordenTemp = doc.orden;
    
    // Actualización optimista: cambiar el estado local inmediatamente
    setDocumentos(prevDocs => 
      prevDocs.map(d => {
        if (d.id === doc.id) return { ...d, orden: docSiguiente.orden };
        if (d.id === docSiguiente.id) return { ...d, orden: ordenTemp };
        return d;
      })
    );
    
    // Actualizar en Firestore en paralelo
    try {
      await Promise.all([
        updateDocument(
          doc.id,
          { orden: docSiguiente.orden },
          currentUser?.uid || 'admin',
          currentUser?.displayName || currentUser?.email || 'Administrador'
        ),
        updateDocument(
          docSiguiente.id,
          { orden: ordenTemp },
          currentUser?.uid || 'admin',
          currentUser?.displayName || currentUser?.email || 'Administrador'
        )
      ]);
    } catch (error) {
      console.error('Error al mover documento:', error);
      // Si falla, recargar desde Firestore sin loading
      await cargarDocumentos(false);
    } finally {
      setProcesandoMovimiento(false);
    }
  };
  
  {/*const handleExportar = async () => {
    await exportConfig();
  };
  
  const handleImportar = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        setImportPreview(jsonData);
        setImportModalOpen(true);
      } catch (error) {
        alert('Error al leer el archivo JSON: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };*/}
  
  const confirmarImportacion = async () => {
    if (!importPreview) return;
    
    const result = await importConfig(
      importPreview,
      currentUser?.uid || 'admin',
      currentUser?.displayName || currentUser?.email || 'Administrador'
    );
    
    if (result.success) {
      await cargarDocumentos();
      setImportModalOpen(false);
      setImportPreview(null);
      alert('Configuración importada correctamente');
    } else {
      alert('Error al importar: ' + result.message);
    }
  };
  
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Encontrar el documento que se está moviendo
    const activeDoc = documentos.find(d => d.id === active.id);
    if (!activeDoc) return;

    // Determinar en qué paso está actualmente
    const activePaso = activeDoc.paso;
    
    // Obtener documentos del mismo paso
    const docsDelPaso = documentos
      .filter(d => d.paso === activePaso && d.activo)
      .sort((a, b) => a.orden - b.orden);

    // Encontrar índices
    const oldIndex = docsDelPaso.findIndex(d => d.id === active.id);
    const newIndex = docsDelPaso.findIndex(d => d.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reordenar documentos
    const reorderedDocs = arrayMove(docsDelPaso, oldIndex, newIndex);
    
    // Actualización optimista inmediata
    const updatedDocumentos = documentos.map(doc => {
      if (doc.paso === activePaso && doc.activo) {
        const newOrder = reorderedDocs.findIndex(d => d.id === doc.id);
        if (newOrder !== -1) {
          return { ...doc, orden: newOrder + 1 };
        }
      }
      return doc;
    });

    setDocumentos(updatedDocumentos);

    // Guardar en Firestore en background
    try {
      await reorderDocuments(
        active.id,
        reorderedDocs.findIndex(d => d.id === active.id) + 1,
        activePaso,
        currentUser?.uid || 'admin',
        currentUser?.displayName || currentUser?.email || 'Administrador'
      );
    } catch (error) {
      console.error('Error al reordenar:', error);
      // Si falla, recargar desde Firestore sin loading
      await cargarDocumentos(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mb-4" />
          <span className="text-xl font-semibold text-gray-800">Cargando configuración</span>
          <span className="text-sm text-gray-500 mt-2">Espere un momento...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              Gestión de Documentos
            </h1>
            <p className="text-gray-600 text-lg">Configure los documentos requeridos para el registro de conductores</p>
          </div>
          
          <div className="flex gap-3">
            {/* Crear Nuevo */}
            <button
              onClick={handleCrearDocumento}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Nuevo Documento
            </button>
            
            {/* Toggle Mostrar Eliminados */}
            <button
              onClick={() => setMostrarEliminados(!mostrarEliminados)}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                mostrarEliminados
                  ? 'bg-gradient-to-r from-gray-700 to-gray-800 text-white shadow-lg'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 shadow-sm'
              }`}
            >
              {mostrarEliminados ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {mostrarEliminados ? 'Ocultar' : 'Ver'} Inactivos
            </button>
            
            {/* Exportar */}
            {/*<button
              onClick={handleExportar}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            */}
            
            {/* Importar */}
            {/*<label className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all font-semibold flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-xl">
              <Upload className="w-4 h-4" />
              Importar
              <input
                type="file"
                accept=".json"
                onChange={handleImportar}
                className="hidden"
              />
            </label>*/}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6">
          {CATEGORIAS.map(cat => {
            const docsCategoria = documentos.filter(d => d.paso === cat.paso && d.activo);
            const docsRequeridos = docsCategoria.filter(d => d.requerido).length;
            
            const colorClasses = {
              emerald: 'from-emerald-500 to-emerald-600',
              green: 'from-green-500 to-green-600',
              teal: 'from-teal-500 to-teal-600'
            };
            
            return (
              <div 
                key={cat.id} 
                className={`bg-gradient-to-br ${colorClasses[cat.color]} text-white rounded-2xl p-6 shadow-xl transform hover:scale-105 transition-all`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-4xl">{cat.icon}</span>
                  <span className="text-5xl font-bold opacity-90">{docsCategoria.length}</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{cat.nombre}</h3>
                <p className="text-sm opacity-90">
                  {docsRequeridos} obligatorio{docsRequeridos !== 1 ? 's' : ''} • Paso {cat.paso}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Drag and Drop Grid */}
      <div className="grid grid-cols-3 gap-6">
        {CATEGORIAS.map(categoria => {
          const docsCategoria = getDocumentosPorPaso(categoria.paso);
          
          const colorClasses = {
            emerald: {
              header: 'from-emerald-600 to-emerald-700',
              button: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-sm'
            },
            green: {
              header: 'from-green-600 to-green-700',
              button: 'bg-green-50 hover:bg-green-100 text-green-700 shadow-sm'
            },
            teal: {
              header: 'from-teal-600 to-teal-700',
              button: 'bg-teal-50 hover:bg-teal-100 text-teal-700 shadow-sm'
            }
          };
          
          return (
            <div key={categoria.id} className="flex flex-col shadow-xl rounded-2xl overflow-hidden">
              {/* Header del paso */}
              <div className={`bg-gradient-to-r ${colorClasses[categoria.color].header} text-white p-5 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{categoria.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">Paso {categoria.paso}</h3>
                    <p className="text-sm opacity-95">{categoria.nombre}</p>
                  </div>
                </div>
                <button
                  onClick={handleCrearDocumento}
                  className={`${colorClasses[categoria.color].button} p-2.5 rounded-xl transition-all shadow-md hover:shadow-lg`}
                  title="Agregar documento"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* Lista de documentos con DnD */}
              <div className="bg-white min-h-[500px] p-4 flex-1">
                {docsCategoria.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <FileText className="w-16 h-16 mb-3 opacity-20" />
                    <p className="text-base font-medium mb-1">Sin documentos</p>
                    <p className="text-sm mb-4">Agrega el primer documento</p>
                    <button
                      onClick={handleCrearDocumento}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Documento
                    </button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={docsCategoria.map(d => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {docsCategoria.map((doc, index) => (
                        <SortableDocumento
                          key={doc.id}
                          doc={doc}
                          onEditar={handleEditarDocumento}
                          onEliminar={handleEliminarDocumento}
                          onRestaurar={handleRestaurarDocumento}
                          onToggleActivo={handleToggleActivo}
                          onCambiarRequerido={handleCambiarRequerido}
                          onMoverArriba={handleMoverArriba}
                          onMoverAbajo={handleMoverAbajo}
                          esPrimero={index === 0}
                          esUltimo={index === docsCategoria.length - 1}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal de creación/edición */}
      <DocumentoFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setDocumentoEditar(null);
        }}
        onSave={handleGuardarDocumento}
        documento={documentoEditar}
        documentosExistentes={documentos}
      />
      
      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && documentoEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className={`p-3 rounded-full ${documentoEliminar.esBase ? 'bg-red-100' : 'bg-orange-100'}`}>
                <AlertTriangle className={`w-6 h-6 ${documentoEliminar.esBase ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {documentoEliminar.esBase ? '⚠️ ELIMINAR DOCUMENTO BASE DEL SISTEMA' : 'Eliminar Documento'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {documentoEliminar.esBase ? (
                    <>
                      <strong>Este documento forma parte de la estructura original.</strong>
                      <br /><br />
                      Los conductores existentes mantendrán este documento pero nuevos registros no lo verán.
                      Esta acción puede afectar el funcionamiento del sistema.
                      <br /><br />
                      ¿Está seguro que desea continuar?
                    </>
                  ) : (
                    <>
                     <h3 className="text-lg font-bold text-red-700 mb-2">
                      Eliminar Documento Adicional
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Esta acción <strong>eliminará definitivamente</strong> el documento "{documentoEliminar.nombre}".
                      No se podrá recuperar.
                    </p>
                    </>
                  )}
                </p>
                
                {documentoEliminar.esBase && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                    <label className="flex items-start gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="mt-1" required />
                      <span className="text-red-800">
                        Entiendo que esto puede afectar el sistema y la experiencia de los conductores
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDocumentoEliminar(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                  documentoEliminar.esBase
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {documentoEliminar.esBase ? 'Sí, Eliminar' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de preview de importación */}
      {importModalOpen && importPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Preview de Importación</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Metadata del archivo:</strong>
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Total documentos: {importPreview.documentos?.length || 0}</li>
                  <li>• Fecha exportación: {importPreview.metadata?.exportDate || 'N/A'}</li>
                  <li>• Documentos base: {importPreview.metadata?.documentosBase || 0}</li>
                  <li>• Documentos adicionales: {importPreview.metadata?.documentosAdicionales || 0}</li>
                </ul>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  <strong>Advertencia:</strong> Esta acción reemplazará toda la configuración actual.
                  Se creará un backup automático antes de importar.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportPreview(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarImportacion}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Confirmar Importación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
