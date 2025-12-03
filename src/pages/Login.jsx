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
    <section className="h-screen">
      <div className="container h-full px-6 py-24">
        <div className="flex h-full flex-wrap items-center justify-center lg:justify-between">
          <div className="mb-12 md:mb-0 md:w-8/12 lg:w-6/12 flex justify-center">
            <img
              src="/images/mav.png"
              className="w-2/3"
              alt="Login illustration"
            />
          </div>

          <div className="md:w-8/12 lg:ml-6 lg:w-5/12">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleEmailLogin}>
                  <div className="mb-4">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div className="mb-4">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1"
                      placeholder="Ingresa tu contraseña"
                    />
                  </div>

                  <div className="mb-6 flex items-center">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember">Recordarme</Label>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full mb-4"
                    disabled={loading}
                  >
                    {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
