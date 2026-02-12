/**
 * UnauthorizedAccess.jsx - Página mostrada cuando un usuario no tiene permisos
 */

import React from 'react';
import { AlertTriangle, Home, LogOut } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';

export function UnauthorizedAccess({ userEmail }) {
  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleGoHome = () => {
    window.location.href = 'https://mav-tic.com'; // Cambiar según tu URL
  };

  return (
    <section className="relative min-h-screen overflow-auto bg-gradient-to-br from-gray-50 to-red-50">
      {/* Animated gradient blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative container h-full px-6 py-12 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white/90 backdrop-blur-lg rounded-lg shadow-2xl p-8 text-center border-0">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>

            {/* Message */}
            <p className="text-gray-600 mb-4">
              Lo sentimos, no tienes permisos para acceder al Panel Administrativo.
            </p>

            {/* User info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <p className="text-sm text-gray-600">Correo asociado:</p>
              <p className="text-gray-900 font-medium break-all">{userEmail}</p>
            </div>

            {/* Warning box */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">
                Si crees que esto es un error, contacta al administrador del sistema.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoHome}
                className="flex items-center justify-center gap-2 w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
              >
                <Home className="w-5 h-5" />
                Ir a la Página Principal
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full h-12 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
}
