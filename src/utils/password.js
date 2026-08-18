/** Genera una contraseña aleatoria segura (sin caracteres ambiguos). */
export function generarPassword(len = 12) {
  const mayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const simb = "!@#$%&*";
  const todos = mayus + minus + nums + simb;

  const rnd = (n) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };

  // Garantiza al menos uno de cada tipo
  let chars = [
    mayus[rnd(mayus.length)],
    minus[rnd(minus.length)],
    nums[rnd(nums.length)],
    simb[rnd(simb.length)],
  ];
  for (let i = chars.length; i < len; i++) {
    chars.push(todos[rnd(todos.length)]);
  }

  // Mezcla (Fisher–Yates con crypto)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
