import React from 'react';

const DeleteAlert = ({ isOpen, onClose, onConfirm, itemName, itemType, isDeleting }) => {
    if (!isOpen) return null;

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
                className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out scale-100"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'modal-pop-in 0.3s ease-out forwards' }}
            >
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h2 className="text-xl font-extrabold text-red-600">Confirmar Eliminación</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition duration-150"
                        disabled={isDeleting}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">¿Estás seguro?</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Esta acción eliminará permanentemente {itemType} <strong>{itemName}</strong> y no se puede deshacer.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition duration-150" 
                            disabled={isDeleting}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={onConfirm} 
                            className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-150 shadow-md disabled:opacity-50" 
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : `Eliminar ${itemType}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteAlert;