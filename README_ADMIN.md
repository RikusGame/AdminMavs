# Mujeres al Volante — Admin (README de subida)

Panel administrativo para la plataforma "Mujeres al Volante".

Descripción
- Interfaz administrativa para gestionar usuarios, conductores, banners, servicios y billetera.

Archivos importantes
- `src/` — Código fuente React
- `public/` — Activos estáticos
- `package.json` — Scripts y dependencias

Cómo subir este proyecto a GitHub (resumen)

1) Desde la carpeta raíz del proyecto:
```powershell
# Inicializa repo (si no está hecho) y crea rama main
if (!(Test-Path .git)) { git init }
git checkout -b main

# Añade archivos y commit inicial
git add .
git commit -m "Initial commit: proyecto Mujeres al Volante admin"
```

2) Crear repo remoto y hacer push:
- Usando GitHub CLI (`gh`):
```powershell
gh repo create <TU_USUARIO>/mujeres-al-volante-admin --public --source=. --remote=origin --push
```
- Si creas el repo manualmente en GitHub, luego en tu máquina:
```powershell
git remote add origin https://github.com/<TU_USUARIO>/mujeres-al-volante-admin.git
git branch -M main
git push -u origin main
```

Notas
- Revisa y elimina credenciales locales antes de subir (ej.: archivos `.env`).
- Recomendado: agregar `LICENSE`, `CONTRIBUTING.md` y etiquetas en el repo remoto.

¡Listo para subir!
