#!/usr/bin/env node
// Genera el hash bcrypt para AUTH_PASSWORD_HASH sin que la contraseña en texto plano quede en
// ningún lado (ni en el shell history si se usa el prompt interactivo, ni en logs, ni en git).
//
// Uso:
//   node core/auth/generate-password-hash.js
//   (te pide la contraseña de forma oculta y te imprime SOLO el hash)
//
// También acepta la contraseña como argumento si preferís no usar el prompt interactivo, pero
// ojo: en ese caso queda en el historial de la terminal.
//   node core/auth/generate-password-hash.js "mi-contraseña"

const { hashPassword } = require("./password");

function readPasswordHidden(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");

    let password = "";
    const onData = (char) => {
      char = char.toString();
      if (char === "\n" || char === "\r" || char === "") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
        return;
      }
      if (char === "") {
        process.exit(1); // Ctrl+C
      }
      if (char === "" || char === "\b") {
        password = password.slice(0, -1);
        return;
      }
      password += char;
    };
    stdin.on("data", onData);
  });
}

async function run() {
  const argPassword = process.argv[2];
  const password = argPassword || (await readPasswordHidden("Contraseña (no se muestra en pantalla): "));

  if (!password || password.length < 12) {
    console.error("\nLa contraseña debe tener al menos 12 caracteres.");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  console.log("\nAUTH_PASSWORD_HASH generado. Copialo tal cual a tu .env / variables de entorno de Vercel:\n");
  console.log(hash);
  console.log("\nNo compartas la contraseña en texto plano en ningún lado (chat, logs, tickets).");
}

run().catch((err) => {
  console.error("Error generando el hash:", err.message);
  process.exit(1);
});
