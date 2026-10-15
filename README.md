# Desenho Assinado

Página que recebe um número inteiro entre 1 e 100 e devolve uma figura em SVG, assinada com um e-mail.

A figura é a tabuada modular no círculo: 240 pontos igualmente espaçados numa circunferência, com cada ponto `i` ligado ao ponto `(k * i) mod 240`, em que `k = número + 1`. O número 1 produz uma cardioide, o 2 uma nefroide, e cada valor gera uma figura diferente.

## Solução

O desenho agora é gerado no servidor por uma Pages Function. O navegador envia só o número e o `id_token` do Google; o servidor valida o token no endpoint `tokeninfo` do Google (status 200, `aud` igual ao Client ID e `email_verified` igual a `"true"`) e assina o desenho com o `email` do token. O formulário não tem mais campo de e-mail.

```
public/
  index.html             formulário com o número e o botão de login do Google
  style.css              aparência da página
  script.js              envia número e token com fetch e mostra a resposta
lib/
  desenho.js             gerarDesenho, fora da pasta pública
functions/
  api/desenho.js         POST /api/desenho (405, 400, 401 e 200)
evidencias/
  exemplo.svg            desenho gerado pelo site publicado
```

## Publicação no Cloudflare Pages

Framework preset: `None`. Build command: vazio. Build output directory: `public`.

Variável de ambiente: `GOOGLE_CLIENT_ID` com o Client ID do OAuth Client (Web application).

## Identificação (preencha após o fork)

Nome: Bruno Augusto
RA: 2026107709
URL: https://
