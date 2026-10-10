# Meu Treino

Aplicativo pessoal em português, feito com HTML, CSS e JavaScript, sem framework, assinatura, conta ou servidor de dados. Os seis treinos e o cardio semanal estão em `config.js`. O navegador seleciona o dia pelo fuso local do dispositivo.

## Abrir no computador

1. Abra esta pasta no Explorador de Arquivos.
2. Dê dois cliques em **Iniciar.cmd**. Mantenha a janela preta aberta.
3. Abra o Chrome e digite **http://127.0.0.1:4173** na barra de endereços.
4. Para encerrar o servidor, volte à janela preta e pressione **Ctrl+C**.

O iniciador usa o Node.js que já está disponível neste computador pelo Codex. Se esse runtime deixar de existir, instale o Node.js LTS pelo [site oficial](https://nodejs.org/), reabra o iniciador e tente novamente. Não é necessário instalar pacotes nem executar `npm install` para usar o aplicativo.

Alternativa: abra um terminal nesta pasta, digite `node server.mjs` e acesse o mesmo endereço. Se aparecer “EADDRINUSE”, outro servidor já ocupa a porta: experimente abrir a página existente ou encerre a janela do servidor anterior.

**Não abra index.html com dois cliques.** O aplicativo usa módulos JavaScript e o cache offline precisa de HTTP local ou HTTPS. O endereço 127.0.0.1 funciona apenas neste computador; para o celular, use a publicação descrita abaixo.

## Durante o treino

1. Confira a rotina do dia. “Escolher outro treino” muda somente a sessão que você vai iniciar; o cardio continua sendo o do dia.
2. Toque em **COMEÇAR TREINO** e depois em **INICIAR SÉRIE**.
3. Informe as repetições que realmente fez. Não existe preenchimento automático da meta. Zero é permitido.
4. Nos exercícios unilaterais, preencha direito e esquerdo antes de concluir. “Trocar ordem” muda a ordem dos campos. Ambos os lados contam como uma série.
5. Carga é opcional, em kg. Na flexão arqueiro, informe o total da série e, se quiser, uma observação do lado. O volume não é duplicado.
6. Ao concluir uma série, o descanso começa. Você pode adicionar 15 ou 30 segundos ou pular o descanso. Quando ele termina, a tela fica vermelha e **espera seu toque** para a próxima etapa.
7. Nos exercícios de 60 segundos, o cronômetro só começa ao tocar em iniciar. Pause pelo botão superior, retome ou encerre a série antecipadamente. O tempo real é registrado.
8. Ao concluir o treino, confira os resultados. Inicie o cardio somente se desejar. É possível escolher uma meta mais curta sem alterar a duração planejada da rotina.
9. O cardio possui início, pausa, retomada e conclusão manual. Atingir a meta não o encerra automaticamente. Toque em **SALVAR E FINALIZAR** ao terminar.

Força: todas as séries do exercício antes de mudar para o seguinte. Transição de 45 segundos entre exercícios e nenhum descanso após a última série do treino. Core: quatro exercícios em sequência por três voltas, 10 segundos entre exercícios e 60 entre voltas. Dead Bug lento com carga: **10–12 repetições**, conforme a correção da rotina. Sessões já salvas preservam a prescrição usada quando foram iniciadas.

O relógio mostra o horário local e os minutos até o retorno configurado, com avisos aos 15 e 5 minutos. Quando o horário-limite já passou, o tempo restante fica em zero. Nenhum aviso encerra seu treino.

## Pausar, recuperar e consultar

**Pausar** congela o cronômetro da etapa. Em seguida, você pode retomar, voltar ao início ou encerrar antecipadamente. O histórico preserva o que foi feito e indica sessões interrompidas.

O aplicativo salva cada série e os campos preenchidos em IndexedDB, no próprio navegador. Depois de recarregar ou reabrir a página, use **RETOMAR TREINO**. Um descanso vencido em segundo plano volta na tela vermelha; não avança automaticamente por várias séries. Um exercício cronometrado vencido registra uma única etapa e seu descanso, respeitando a confirmação seguinte.

No **Histórico**, toque em uma sessão para abrir os detalhes, editar repetições, lados, tempo, carga e observação. A edição afeta somente aquele registro. O seletor de exercício compara os resultados ao longo das sessões.

Em **Ajustes**, configure horários, vibração, tentativa de manter a tela ligada e descansos. Mudanças valem para novas sessões; as anteriores preservam os dados e as configurações usadas.

## Backup

1. Abra **Ajustes → EXPORTAR BACKUP JSON**.
2. Guarde o arquivo baixado em uma pasta segura. Ele contém histórico e configurações.
3. Em outro dispositivo, abra o aplicativo e vá a **Ajustes → IMPORTAR BACKUP JSON**.
4. Escolha o arquivo e leia a confirmação. A importação **substitui** o histórico e as configurações do dispositivo de destino.
5. Confirme apenas depois de exportar os dados atuais, se quiser preservá-los. O app valida formato, versão e registros e rejeita sessões duplicadas no arquivo. A restauração é feita em uma transação única.

Os dados não são enviados a servidores. Limpar dados do site, desinstalar/remover dados do navegador ou mudar de endereço de hospedagem pode tornar o histórico inacessível. Exporte backups regularmente. O histórico local do computador não aparece automaticamente no celular.

## Publicar gratuitamente no GitHub Pages

Este projeto já está preparado para publicação estática em subdiretório; não precisa de build. Você ainda precisa executar estes passos na sua conta. **O projeto não foi publicado durante esta entrega.**

1. Entre em [github.com](https://github.com/) e crie uma conta gratuita, se necessário.
2. Clique em **+ → New repository**. Nome sugerido: `meu-treino`. Selecione **Public**, marque a opção de criar um README e clique em **Create repository**.
3. Na página do repositório, use **Add file → Upload files**. Arraste os arquivos da aplicação e a pasta **assets**, preservando suas subpastas. `index.html` deve ficar na raiz do repositório, junto de `app.js`, `config.js`, `engine.js`, `storage.js`, `style.css`, `sw.js`, `manifest.webmanifest` e `IMAGENS.md`. Pode incluir o README desta pasta.
4. Não envie `.git`, `test-results`, `catalog-source.json`, backups ou dados pessoais. O app funciona sem `tests`, `scripts`, `server.mjs`, `Iniciar.cmd` e `package.json` na hospedagem, embora esses arquivos sejam úteis no projeto completo.
5. Inclua também `.nojekyll` (arquivo vazio). Se o Explorador não mostrar o arquivo, ative a visualização de itens ocultos; alternativamente crie esse arquivo pelo botão **Add file → Create new file** no GitHub.
6. Clique em **Commit changes** para salvar os arquivos.
7. Abra **Settings → Pages**. Em **Source**, escolha **Deploy from a branch**; selecione a branch `main` e a pasta **/(root)**. Clique em **Save**.
8. Aguarde a publicação. O endereço aparecerá nessa mesma tela, normalmente `https://SEU-USUARIO.github.io/meu-treino/`.
9. Abra esse endereço e confira se a página carrega, inicia uma sessão e salva dados. Depois siga a instalação no Android.

Instruções baseadas na [documentação oficial de publicação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). O repositório público contém o código; seu histórico continua no navegador, desde que você não envie backups ao repositório.

## Instalar no Android e conferir offline

1. No Chrome do Android, abra o endereço **HTTPS publicado**, com internet.
2. Aguarde o primeiro carregamento e visite um exercício com demonstração.
3. No menu de três pontos do Chrome, procure **Instalar app** ou **Adicionar à tela inicial**. A opção também pode aparecer dentro do aplicativo quando o navegador oferecer a instalação.
4. Abra o Meu Treino pelo ícone instalado.
5. Feche e reabra com modo avião para conferir o cache offline no seu aparelho. Teste registrar uma série e retomar uma sessão antes de depender do aplicativo em um treino real.

O service worker salva todos os arquivos essenciais e imagens locais. Instalação e wake lock dependem das capacidades do navegador e de HTTPS. Alertas e vibração não são garantidos com a tela bloqueada. Não há sons.

## Arquivos e manutenção

- `config.js`: rotina, metas, tempos padrão e instruções técnicas. IDs estáveis permitem comparar exercícios no histórico.
- `engine.js`: estados, séries, circuitos e cronômetros por timestamps.
- `storage.js`: IndexedDB e validação/restauração de backup.
- `app.js` / `style.css` / `index.html`: interface e recursos do navegador.
- `manifest.webmanifest` / `sw.js` / `assets`: instalação, cache e imagens.
- `IMAGENS.md`: correspondências, fontes, licença e lista das 21 imagens pendentes.
- `TESTES.md`: verificações realizadas e limites da entrega.

Ao modificar arquivos essenciais para uma nova publicação, aumente a versão `CACHE` em `scripts/build-cache.mjs` e rode `node scripts/build-cache.mjs`. Esse comando atualiza o service worker e a lista de arquivos locais. Depois publique os arquivos alterados. A atualização aguarda confirmação em **Ajustes** e não deve ser aplicada durante uma sessão aberta. Novas imagens exigem licença, atribuição e correspondência verificadas antes de serem incluídas.

## Limitações conhecidas

- Testado em Chromium no Windows, com viewport de celular. **Não testado em aparelho Android físico, instalação Android, wake lock real, vibração física ou GitHub Pages publicado.**
- Sete movimentos têm ilustrações verificadas. Outros 21 usam uma apresentação neutra com instrução escrita; consulte `IMAGENS.md`.
- Não há sincronização entre dispositivos nem promessa de alarmes em segundo plano.
- A duração total do treino inclui pausas e esperas; o tempo registrado dos exercícios cronometrados exclui pausas.
- Use uma aba por vez. Duas abas executando ou editando a mesma sessão podem sobrescrever dados. O armazenamento é separado por endereço/origem; mudar a URL pode exigir restaurar um backup.
- Alterar manualmente o relógio do dispositivo durante o treino pode afetar cronômetros baseados em timestamps.

Para verificar o motor, abra um terminal nesta pasta e rode `node --test tests/*.test.mjs`. O teste de navegador, `node tests/browser.mjs`, usa Playwright e Chrome; nesta máquina o Playwright está no runtime do Codex. Em outra máquina, configure `PLAYWRIGHT_PACKAGE` e `CHROME_PATH` para os caminhos existentes, se desejar executar esse teste de desenvolvimento. Essas ferramentas não são dependências do aplicativo publicado.
