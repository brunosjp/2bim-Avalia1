// script.js
// O navegador so faz duas coisas: obter o id_token do Google e enviar o numero ao servidor.
// Quem desenha e assina e a Pages Function em /api/desenho.

// Client ID publico do OAuth Client (Web application). Nao e segredo.
const GOOGLE_CLIENT_ID = "836552168566-1gas52v6ropt5qd8q54tmccn4vbgevvi.apps.googleusercontent.com";

const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const mensagem = document.getElementById("mensagem");
const figura = document.getElementById("desenho");
const botaoBaixar = document.getElementById("baixar");
const textoConta = document.getElementById("conta");
const botaoSair = document.getElementById("sair");

let token = "";
let ultimoSvg = "";

// Decodifica o payload do JWT so para exibir o e-mail na tela.
// A verificacao de verdade acontece no servidor.
function emailDoToken(jwt) {
  try {
    const base64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)).email || "";
  } catch {
    return "";
  }
}

function atualizarLogin() {
  const logado = Boolean(token);
  textoConta.hidden = !logado;
  botaoSair.hidden = !logado;
  textoConta.textContent = logado ? `Conectado como ${emailDoToken(token) || "conta Google"}` : "";
}

function iniciarGoogle() {
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resposta) => {
      token = resposta.credential || "";
      mensagem.textContent = "";
      atualizarLogin();
    },
  });
  google.accounts.id.renderButton(document.getElementById("botao-google"), {
    theme: "filled_black",
    text: "signin_with",
    locale: "pt-BR",
  });
}

// A biblioteca do Google carrega de forma assincrona.
if (window.google?.accounts?.id) {
  iniciarGoogle();
} else {
  window.onGoogleLibraryLoad = iniciarGoogle;
}

botaoSair.addEventListener("click", () => {
  token = "";
  window.google?.accounts?.id?.disableAutoSelect();
  limpar();
  atualizarLogin();
});

function limpar() {
  ultimoSvg = "";
  figura.innerHTML = "";
  botaoBaixar.hidden = true;
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";
  limpar();

  // Nenhuma validacao local: o servidor decide e a pagina mostra o resultado.
  const valor = campoNumero.value.trim();
  const numero = valor === "" ? null : Number(valor);

  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch("/api/desenho", {
      method: "POST",
      headers,
      body: JSON.stringify({ numero }),
    });
  } catch {
    mensagem.textContent = "Não foi possível falar com o servidor.";
    return;
  }

  if (resposta.ok) {
    ultimoSvg = await resposta.text();
    figura.innerHTML = ultimoSvg;
    botaoBaixar.hidden = false;
    return;
  }

  let detalhe = "";
  try {
    detalhe = (await resposta.json()).erro || "";
  } catch {}

  if (resposta.status === 400) {
    mensagem.textContent = `Erro 400 (pedido inválido): ${detalhe || "use um inteiro de 1 a 100."}`;
  } else if (resposta.status === 401) {
    mensagem.textContent = `Erro 401 (não autenticado): ${detalhe || "faça login com o Google."}`;
    token = "";
    atualizarLogin();
  } else {
    mensagem.textContent = `Erro ${resposta.status}: ${detalhe}`;
  }
});

botaoBaixar.addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([ultimoSvg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "exemplo.svg";
  link.click();
  URL.revokeObjectURL(url);
});
