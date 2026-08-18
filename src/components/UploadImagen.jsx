import { useRef } from "react";
import { Upload, X } from "lucide-react";

/**
 * Campo de subida de una imagen con vista previa.
 * Props: label, file (File|null), onChange(File|null), required
 */
export function UploadImagen({ label, file, onChange, required = false }) {
  const inputRef = useRef(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-gray-400 hover:text-red-500 transition"
            title="Quitar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {preview ? (
        <img
          src={preview}
          alt={label}
          className="w-full h-28 object-cover rounded-md cursor-pointer"
          onClick={() => inputRef.current?.click()}
        />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-28 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition"
        >
          <Upload className="w-5 h-5 mb-1" />
          <span className="text-xs">Subir imagen</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}

export default UploadImagen;
