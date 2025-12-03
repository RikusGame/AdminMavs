// src/modal/AddAmountModal.jsx
import React, { useState, useEffect } from "react";

export default function AddAmountModal({ isOpen, onClose, onConfirm, initialCurrency = "$" }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setNote("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e && e.preventDefault();
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError("Por favor, agregue el monto a la billetera");
      return;
    }
    setError("");
    // Llamamos al callback del padre con los datos
    onConfirm({ amount: num, note });
    // no cerramos aquí: el padre decide cuándo cerrar (útil para esperar respuesta del servidor)
  };

  if (!isOpen) return null;

  return (
    // overlay
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Agregar Monto a la Billetera</h3>
          <button onClick={onClose} style={closeBtnStyle}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Cantidad</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ingrese el monto"
            style={inputStyle}
          />
          {error && <div style={{ color: "red", marginTop: 6 }}>{error}</div>}

          <label style={{ ...labelStyle, marginTop: 12 }}>Nota</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            style={inputStyle}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Close</button>
            <button type="submit" style={primaryBtnStyle}>Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* estilos inline mínimos para que funcione sin CSS externo */
const overlayStyle = {
  position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)",
  display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
};
const modalStyle = {
  width: 520, background: "#fff", padding: 20, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.2)"
};
const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 4, border: "1px solid #ddd" };
const labelStyle = { fontSize: 13, marginBottom: 6, display: "block" };
const closeBtnStyle = { border: "none", background: "transparent", fontSize: 22, cursor: "pointer" };
const primaryBtnStyle = { background: "#0b8f3b", color: "#fff", padding: "8px 14px", border: "none", borderRadius: 6, cursor: "pointer" };
const secondaryBtnStyle = { background: "#eee", color: "#111", padding: "8px 14px", border: "none", borderRadius: 6, cursor: "pointer" };
