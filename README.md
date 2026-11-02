# Sprachpraxis

## Reproduzir áudio no Android

O app usa os MP3 enviados ao Blob pelo endpoint de áudio e um único elemento `<audio>` persistente. Em navegadores compatíveis, a Media Session API mostra a frase atual e fornece controles de reproduzir, pausar, avançar e voltar na notificação e na tela bloqueada.

Para usar, abra o app no Chrome para Android e toque em **Ouvir** ou **Tocar tudo**. Para instalar como PWA, use o menu do Chrome e escolha **Adicionar à tela inicial**. Os arquivos MP3 precisam estar publicados no Blob e acessíveis pelo endpoint configurado. A voz de fallback do navegador pode não continuar quando a página fica em segundo plano.

O navegador e as regras de economia de bateria do aparelho ainda podem suspender uma página, sobretudo entre frases de uma lista longa. A PWA e os controles de mídia melhoram a experiência, mas não substituem um serviço de reprodução em primeiro plano de um app Android nativo quando é necessária reprodução contínua garantida.
