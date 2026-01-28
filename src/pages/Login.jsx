import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

export function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess?.();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-green-50">
      {/* Animated gradient blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative container h-full px-6 py-24">
        <div className="flex h-full flex-wrap items-center justify-center lg:justify-between">
          <div className="mb-12 md:mb-0 md:w-8/12 lg:w-6/12 flex justify-center">
            <img
              src="/images/mav.png"
              className="w-2/3 mx-auto drop-shadow-2xl"
              alt="Login illustration"
            />
          </div>

          <div className="md:w-8/12 lg:ml-6 lg:w-5/12">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-lg">
              <CardContent className="p-8">
                <div className="mb-8 text-center">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent mb-2">
                    Panel Administrativo
                  </h1>
                  <p className="text-gray-600">Ingresa tus credenciales para continuar</p>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-6">
                  <div>
                    <Label htmlFor="email" className="text-gray-700 font-medium">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-2 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-all"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-700 font-medium">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-2 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-all"
                      placeholder="Ingresa tu contraseña"
                    />
                  </div>

                  <div className="flex items-center">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" className="border-gray-400" />
                      <Label htmlFor="remember" className="text-gray-600 cursor-pointer">
                        Recordarme
                      </Label>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg animate-shake">
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Iniciando sesión...</span>
                      </div>
                    ) : (
                      "Iniciar Sesión"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
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
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </section>
  );
}
