import React, { useState } from 'react';
import { db, storage } from '../config/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import DeleteAlert from './DeleteAlert';

const BannerCard = ({ banner, onEditClick }) => {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const toggleActivate = async () => {
        const bannerDocRef = doc(db, 'banners', banner.id);
        try {
            await updateDoc(bannerDocRef, {
                isActive: !banner.isActive
            });
        } catch (error) {
            console.error('Error toggling banner status:', error);
            alert('Error al cambiar el estado del banner.');
        }
    };

    const openDeleteModal = () => {
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            if (banner.imageUrl) {
                try {
                    // Extraer el path del storage desde la URL completa
                    // Si es una URL completa de Firebase Storage
                    if (banner.imageUrl.includes('firebasestorage.googleapis.com')) {
                        const urlParts = banner.imageUrl.split('/o/')[1];
                        const encodedPath = urlParts.split('?')[0];
                        const decodedPath = decodeURIComponent(encodedPath);
                        const imageRef = ref(storage, decodedPath);
                        await deleteObject(imageRef);
                        console.log('✅ Imagen eliminada de Storage');
                    } else {
                        // Si es solo el nombre del archivo (banners antiguos)
                        const imageRef = ref(storage, `banners/${banner.imageUrl}`);
                        await deleteObject(imageRef);
                    }
                } catch (storageError) {
                    console.error('Error al eliminar imagen de Storage:', storageError);
                    // Continuar con la eliminación del documento aunque falle la imagen
                }
            }
            
            const bannerDocRef = doc(db, 'banners', banner.id);
            await deleteDoc(bannerDocRef);
            console.log('✅ Banner eliminado de Firestore');
            
            closeDeleteModal();
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('Error al eliminar el banner.');
        }
        setIsDeleting(false);
    };

    const handleEdit = () => {
        onEditClick(banner); 
    };

    const activateButtonClasses = banner.isActive
        ? 'bg-yellow-500 hover:bg-yellow-600 text-gray-900'
        : 'bg-green-500 hover:bg-green-600 text-white';    
    
    const statusIndicatorClasses = banner.isActive
        ? 'bg-green-600'
        : 'bg-red-600';  

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden transition-shadow duration-300 hover:shadow-md">
            
            <div className="relative h-40 overflow-hidden">
                <img 
                    src={banner.imageUrl} 
                    alt={banner.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                        console.error('Error al cargar imagen del banner:', banner.imageUrl);
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESin imagen%3C/text%3E%3C/svg%3E';
                    }}
                />
                <div 
                    className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium text-white rounded-full ${statusIndicatorClasses}`}
                >
                    {banner.isActive ? 'Activo' : 'Inactivo'}
                </div>
            </div>

            <div className="p-4">
                <h4 className="text-lg font-semibold text-gray-800 truncate mb-4">{banner.name}</h4>
                
                <div className="flex gap-2">
                    <button
                        onClick={toggleActivate}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg ${activateButtonClasses} transition duration-150`}
                    >
                        {banner.isActive ? 'Desactivar' : 'Activar'}
                    </button>

                    <button 
                        onClick={handleEdit} 
                        className="flex-1 py-2 text-sm font-medium text-white bg-[#a8d96f] hover:bg-[#96c55f] rounded-lg transition duration-150"
                    >
                        Editar
                    </button>

                    <button 
                        onClick={openDeleteModal} 
                        className="flex-1 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition duration-150"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
            
            <DeleteAlert
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={handleDelete}
                itemName={banner.name}
                itemType="el banner"
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default BannerCard;