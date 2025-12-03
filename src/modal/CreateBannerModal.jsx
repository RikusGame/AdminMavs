import React, { useState } from 'react';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const CreateBannerModal = ({ isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState({ 
        name: '', 
        imageUrl: '',
        isActive: true,
        order: 0
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!selectedFile) {
            alert('Por favor selecciona una imagen');
            return;
        }

        setIsUploading(true);
        try {
            const fileName = `${Date.now()}_${selectedFile.name}`;
            const storageRef = ref(storage, `banners/${fileName}`);
            
            // Subir imagen a Storage
            await uploadBytes(storageRef, selectedFile);
            
            // Obtener URL de descarga completa
            const downloadURL = await getDownloadURL(storageRef);
            console.log('✅ Imagen subida a Storage:', downloadURL);
            
            const bannerData = {
                ...formData,
                imageUrl: downloadURL
            };
            
            await onSave(bannerData);
            
            setFormData({ name: '', imageUrl: '', isActive: true, order: 0 });
            setSelectedFile(null);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear el banner');
        }
        setIsUploading(false);
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
                    <h2 className="text-xl font-extrabold text-gray-800">Crear Nuevo Banner</h2>
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
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Nombre</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700" required />
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Seleccionar Imagen</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange} 
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                            required
                        />
                        {selectedFile && (
                            <div className="mt-4 border border-gray-300 rounded-md overflow-hidden">
                                <p className="text-xs text-center p-1 bg-gray-200">Previsualización</p>
                                <img 
                                    src={URL.createObjectURL(selectedFile)} 
                                    alt="Vista previa" 
                                    className="w-full h-32 object-contain bg-white" 
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition duration-150" disabled={isUploading}>Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-[#a8d96f] text-white font-medium rounded-lg hover:bg-[#96c55f] transition duration-150 shadow-md disabled:opacity-50" disabled={isUploading}>
                            {isUploading ? 'Creando...' : 'Guardar Banner'}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

export default CreateBannerModal;