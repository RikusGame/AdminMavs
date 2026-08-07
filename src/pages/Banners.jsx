import React, { useState, useEffect } from 'react';
import { db, storage } from '../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CreateBannerModal from '../modal/CreateBannerModal';
import EditBannerModal from '../modal/EditBannerModal';
import BannerCard from '../components/BannerCard';

const Banners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);

    const handleEditClick = (banner) => {
        setEditingBanner(banner);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (updatedData, selectedFile) => {
        const bannerDocRef = doc(db, 'banners', updatedData.id);
        try {
            let dataToUpdate = { ...updatedData };
            delete dataToUpdate.id;

            if (selectedFile) {
                const fileName = `${Date.now()}_${selectedFile.name}`;
                const storageRef = ref(storage, `banners/${fileName}`);
                
                // Subir imagen a Storage
                await uploadBytes(storageRef, selectedFile);
                
                // Obtener URL de descarga completa (getDownloadURL ya está
                // importado estático arriba; el import dinámico generaba el
                // warning de "mixed import" que impedía el chunking). Card [224]
                const downloadURL = await getDownloadURL(storageRef);
                
                dataToUpdate.imageUrl = downloadURL;
                console.log('✅ Imagen subida a Storage:', downloadURL);
            }

            await updateDoc(bannerDocRef, dataToUpdate);
            setIsEditModalOpen(false);
            setEditingBanner(null);
        } catch (error) {
            console.error('Error updating banner:', error);
            alert('Error al guardar los cambios.');
        }
    };

    const handleSaveNew = async (newBannerData) => {
        try {
            await addDoc(collection(db, 'banners'), newBannerData);
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating new banner:', error);
            throw error;
        }
    };

    useEffect(() => {
        const bannersCollectionRef = collection(db, 'banners');

        const unsubscribe = onSnapshot(
            bannersCollectionRef,
            (snapshot) => {
                const bannersData = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                }));
                setBanners(bannersData);
                setLoading(false);
            },
            (err) => {
                console.error("Firestore Error:", err);
                setError("Fallo al cargar los banners. Revisa la consola.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);


      if (loading ) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <img src="public/images/spinner.gif" alt="Loading Spinner" className="w-10" />
        <p className="text-black-600">Cargando banners...</p>
      </div>
    );
  }
    if (error) return <div className="text-center p-8 text-red-600 font-bold">{error}</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Administración de Banners</h1>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-[#a8d96f] hover:bg-[#96c55f] text-white font-medium py-2 px-4 rounded-lg shadow-sm transition duration-150"
                >
                    + Nuevo Banner
                </button>
            </div>
            
            {banners.length === 0 ? (
                <div className="bg-white rounded-lg p-8 shadow-sm text-center">
                    <p className="text-gray-500 text-lg">No hay banners aún, ¡crea uno!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {banners.map((banner) => (
                        <BannerCard 
                            key={banner.id} 
                            banner={banner} 
                            onEditClick={handleEditClick} 
                        />
                    ))}
                </div>
            )}


            <CreateBannerModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveNew}
            />

            {isEditModalOpen && editingBanner && (
                <EditBannerModal 
                    isOpen={isEditModalOpen} 
                    bannerData={editingBanner}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};

export default Banners;