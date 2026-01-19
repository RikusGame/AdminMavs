/**
 * DocumentoFormModal - Modal para crear y editar documentos
 */

import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';

const CATEGORIAS = [
  { value: 'Documentos Personales', label: 'Paso 1: Documentos Personales', paso: 1, colorClass: 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white' },
  { value: 'Documentos Vehículo', label: 'Paso 2: Documentos del Vehículo', paso: 2, colorClass: 'bg-gradient-to-r from-green-600 to-emerald-500 text-white' },
  { value: 'Fotografías Vehículo', label: 'Paso 3: Fotografías del Vehículo', paso: 3, colorClass: 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white' }
];

const TIPOS_CAMPO = [
  { value: 'foto', label: 'Fotografía/Imagen', icon: '📷' },
  { value: 'texto', label: 'Texto', icon: '📝' },
  { value: 'numero', label: 'Número', icon: '🔢' },
  // { value: 'seleccion', label: 'Selección (Dropdown)', icon: '📋' },
  // Tipo "selección" deshabilitado temporalmente porque la creación no funciona correctamente
];

export default function DocumentoFormModal({ isOpen, onClose, onSave, documento = null, documentosExistentes = [] }) {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Documentos Personales',
    tipo: 'foto',
    // 'requerido' puede ser: true (obligatorio), false (opcional), null (ninguno)
    requerido: true,
    descripcion: '',
    orden: 1
  });
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  
  const esEdicion = !!documento;
  
  useEffect(() => {
    if (documento) {
      setFormData({
        nombre: documento.nombre || '',
        categoria: documento.categoria || 'Documentos Personales',
        tipo: documento.tipo || 'foto',
        requerido: documento.requerido !== undefined ? documento.requerido : true,
        descripcion: documento.descripcion || '',
        orden: documento.orden || 1
      });
    } else {
      // Reset al abrir para crear nuevo
      setFormData({
        nombre: '',
        categoria: 'Documentos Personales',
        tipo: 'foto',
        requerido: true,
        descripcion: '',
        orden: 1
      });
    }
    setErrors({});
  }, [documento, isOpen]);
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    } else {
      // Verificar que no exista otro documento con el mismo nombre (solo si es nuevo o cambió el nombre)
      const nombreExiste = documentosExistentes.some(doc => 
        doc.nombre.toLowerCase() === formData.nombre.trim().toLowerCase() &&
        doc.activo &&
        (!esEdicion || doc.id !== documento.id)
      );
      
      if (nombreExiste) {
        newErrors.nombre = 'Ya existe un documento con ese nombre';
      }
    }
    
    // Validar descripción
    if (formData.descripcion && formData.descripcion.length > 200) {
      newErrors.descripcion = 'La descripción no debe exceder 200 caracteres';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Obtener paso desde categoría
      const categoriaInfo = CATEGORIAS.find(c => c.value === formData.categoria);
      const paso = categoriaInfo ? categoriaInfo.paso : 1;
      
      const documentoData = {
        ...formData,
        paso,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim()
      };
      
      await onSave(documentoData);
      onClose();
    } catch (error) {
      console.error('Error al guardar documento:', error);
      setErrors({ general: 'Error al guardar el documento. Intente nuevamente.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {esEdicion ? 'Editar Documento' : 'Nuevo Documento'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSaving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error general */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}
          
          {/* Nombre del documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Documento <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Certificado Médico"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.nombre
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isSaving}
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
            )}
          </div>
          
          {/* Categoría/Paso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría (Paso del Stepper) <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            >
              {CATEGORIAS.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Este documento aparecerá en el paso seleccionado del formulario de registro
            </p>
          </div>
          
          {/* Tipo de campo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Campo <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TIPOS_CAMPO.map(tipo => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => handleChange('tipo', tipo.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    formData.tipo === tipo.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isSaving}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{tipo.icon}</span>
                    <span className={`font-medium ${
                      formData.tipo === tipo.value ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {tipo.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Requerido - Control de 3 estados */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <div className="inline-flex rounded-lg shadow-sm" role="tablist" aria-label="Estado documento">
              <button
                type="button"
                onClick={() => handleChange('requerido', true)}
                className={`px-4 py-2 rounded-l-lg border-2 transition-colors flex items-center gap-2 font-medium ${formData.requerido === true ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-red-50'}`}
                disabled={isSaving}
              >
                <span className="w-2 h-2 rounded-full bg-white/30" />
                Obligatorio
              </button>
              <button
                type="button"
                onClick={() => handleChange('requerido', false)}
                className={`px-4 py-2 border-t-2 border-b-2 transition-colors flex items-center gap-2 font-medium ${formData.requerido === false ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50'}`}
                disabled={isSaving}
              >
                <span className="w-2 h-2 rounded-full bg-white/30" />
                Opcional
              </button>
              <button
                type="button"
                onClick={() => handleChange('requerido', null)}
                className={`px-4 py-2 rounded-r-lg border-2 transition-colors flex items-center gap-2 font-medium ${formData.requerido === null ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                disabled={isSaving}
              >
                <span className="w-2 h-2 rounded-full bg-white/30" />
                Ninguno
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Elige si el documento será obligatorio, opcional o no aplicará.</p>
          </div>
          
          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción (Opcional)
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Descripción breve que verá el conductor al subir este documento"
              rows={3}
              maxLength={200}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                errors.descripcion
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isSaving}
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Esta descripción aparecerá como ayuda para el conductor
              </p>
              <p className="text-xs text-gray-500">
                {formData.descripcion.length}/200
              </p>
            </div>
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
            )}
          </div>
          
          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Vista Previa en Móvil</h3>
            <div className="bg-white border border-gray-300 rounded p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900">{formData.nombre || 'Nombre del Documento'}</p>
                  {formData.descripcion && (
                    <p className="text-xs text-gray-500 mt-1">{formData.descripcion}</p>
                  )}
                </div>
                {/* Estado preview: Obligatorio / Opcional / Ninguno */}
                {formData.requerido === true && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">OBLIGATORIO</span>
                )}
                {formData.requerido === false && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">OPCIONAL</span>
                )}
                {formData.requerido === null && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded">NINGUNO</span>
                )}
              </div>
              <div className="mt-3 bg-gray-100 border-2 border-dashed border-gray-300 rounded h-20 flex items-center justify-center">
                <span className="text-gray-400 text-sm">
                  {formData.tipo === 'foto' && '📷 Área de carga de imagen'}
                  {formData.tipo === 'texto' && '📝 Campo de texto'}
                  {formData.tipo === 'numero' && '🔢 Campo numérico'}
                  {formData.tipo === 'seleccion' && '📋 Lista desplegable'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
