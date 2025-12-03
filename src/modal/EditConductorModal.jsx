import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const EditConductorModal = ({ isOpen, onClose, conductor, onSave }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        telefono: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (conductor) {
            setFormData({
                nombre: conductor.nombre || '',
                correo: conductor.email || '',
                telefono: conductor.telefono || ''
            });
        }
    }, [conductor]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        
        try {
            const conductorRef = doc(db, 'taxistas', conductor.id);
            await updateDoc(conductorRef, {
                'perfilTaxista.nombre': formData.nombre,
                'perfilTaxista.correo': formData.correo,
                'perfilTaxista.telefono': formData.telefono
            });
            
            onSave();
            onClose();
        } catch (error) {
            console.error('Error al actualizar conductor:', error);
            alert('Error al actualizar el conductor');
        }
        setIsUpdating(false);
    };

    return (
        <div 
            className="fixed inset-0 bg-transparent backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-out"
            onClick={onClose}
        >
            <style jsx global>{`
                @keyframes modal-pop-in {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-out scale-100"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'modal-pop-in 0.3s ease-out forwards' }}
            >
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h2 className="text-xl font-extrabold text-gray-800">Editar Conductor</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombre">
                                Nombre
                            </label>
                            <input 
                                type="text" 
                                id="nombre" 
                                name="nombre" 
                                value={formData.nombre} 
                                onChange={handleChange} 
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline" 
                                required 
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="correo">
                                Correo Electrónico
                            </label>
                            <input 
                                type="email" 
                                id="correo" 
                                name="correo" 
                                value={formData.correo} 
                                onChange={handleChange} 
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline" 
                                required 
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefono">
                                Teléfono
                            </label>
                            <input 
                                type="tel" 
                                id="telefono" 
                                name="telefono" 
                                value={formData.telefono} 
                                onChange={handleChange} 
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline" 
                                required 
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition duration-150" 
                                disabled={isUpdating}
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2 bg-[#a8d96f] text-white font-medium rounded-lg hover:bg-[#96c55f] transition duration-150 shadow-md disabled:opacity-50" 
                                disabled={isUpdating}
                            >
                                {isUpdating ? 'Actualizando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditConductorModal;