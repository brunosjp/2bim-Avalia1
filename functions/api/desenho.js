// functions/api/desenho.js
// POST /api/desenho: gera o SVG no servidor e assina com o e-mail do id_token do Google.
// Ordem das verificacoes exigida pelo contrato: metodo (405) -> corpo (400) -> token (401).

import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

const GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo";

function respostaDeErro(status, erro, cabecalhosExtras = {}) {
  return new Response(JSON.stringify({ erro }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cabecalhosExtras,
    },
  });
}

// Le o corpo e devolve { numero } ou { erro }.
async function validarCorpo(request) {
  const bruto = await request.text().catch(() => "");
  if (!bruto.trim()) return { erro: "Corpo da requisicao ausente." };

  let corpo;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return { erro: "JSON invalido." };
  }

  if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) {
    return { erro: "Envie um objeto JSON como {\"numero\": 42}." };
  }
  if (!Object.hasOwn(corpo, "numero")) return { erro: "Campo numero ausente." };

  // numeroValido usa Number.isInteger: recusa texto ("9"), decimais e valores fora de 1..100.
  if (!numeroValido(corpo.numero)) return { erro: "O numero deve ser um inteiro de 1 a 100." };

  return { numero: corpo.numero };
}

// Valida o id_token no Google e devolve o e-mail, ou null se o token nao servir.
async function emailVerificado(request, clientId) {
  const [tipo, token] = (request.headers.get("Authorization") || "").split(" ");
  if (!tipo || tipo.toLowerCase() !== "bearer" || !token) return null;

  try {
    const resposta = await fetch(`${GOOGLE_TOKENINFO}?id_token=${encodeURIComponent(token)}`);
    if (resposta.status !== 200) return null; // token invalido ou expirado

    const info = await resposta.json();
    if (info.aud !== clientId) return null; // emitido para outro aplicativo
    if (String(info.email_verified) !== "true") return null; // e-mail nao verificado
    return typeof info.email === "string" && info.email ? info.email : null;
  } catch {
    return null;
  }
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return respostaDeErro(405, "Metodo nao permitido. Use POST.", { Allow: "POST" });
  }

  const corpo = await validarCorpo(request);
  if (corpo.erro) return respostaDeErro(400, corpo.erro);

  const email = env.GOOGLE_CLIENT_ID ? await emailVerificado(request, env.GOOGLE_CLIENT_ID) : null;
  if (!email) {
    return respostaDeErro(401, "Faca login com o Google para desenhar.", { "WWW-Authenticate": "Bearer" });
  }

  // A assinatura vem do token verificado, nunca do formulario.
  return new Response(gerarDesenho(corpo.numero, email), {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
  });
}
