# Sprachpraxis

## Sincronização e áudio no Azure

O app continua funcionando sem login e guarda o progresso localmente. O login Microsoft opcional sincroniza o progresso pela Function App; os MP3 permanecem em um contêiner privado e são servidos pela mesma API. Os IDs de `auth-config.js` são identificadores públicos de aplicativos, não segredos.

O workflow `deploy-storage.yml` publica o site no Storage Static Website. O workflow `deploy-functions.yml` publica `api/` na Function App por OIDC. A identidade federada do GitHub precisa ter a função **Website Contributor** no escopo da Function App, além da permissão já usada para publicar o site.

## Reproduzir áudio no Android

O app usa os MP3 enviados ao Blob pelo endpoint de áudio e um único elemento `<audio>` persistente. Em navegadores compatíveis, a Media Session API mostra a frase atual e fornece controles de reproduzir, pausar, avançar e voltar na notificação e na tela bloqueada.

Para usar, abra o app no Chrome para Android e toque em **Ouvir** ou **Tocar tudo**. Para instalar como PWA, use o menu do Chrome e escolha **Adicionar à tela inicial**. Os arquivos MP3 precisam estar publicados no Blob e acessíveis pelo endpoint configurado. A voz de fallback do navegador pode não continuar quando a página fica em segundo plano.

O navegador e as regras de economia de bateria do aparelho ainda podem suspender uma página, sobretudo entre frases de uma lista longa. A PWA e os controles de mídia melhoram a experiência, mas não substituem um serviço de reprodução em primeiro plano de um app Android nativo quando é necessária reprodução contínua garantida.
