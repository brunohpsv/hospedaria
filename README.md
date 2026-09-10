# Bloco de Notas - Gestão Hoteleira

Sistema ultra minimalista para gestão de hotéis, pousadas e vilas no estilo Bloco de Notas do Windows, com atalhos de teclado e alta produtividade.

---

## 🚀 Como Publicar no GitHub Pages com BRANCH (100% Gratuito)

O projeto está configurado para publicar através da branch **`gh-pages`** (sem necessidade da pasta `/docs`).

### Opção 1: Automático pelo GitHub (Recomendado)
Sempre que você enviar o código para a branch `main` ou `master`:
1. O fluxo do **GitHub Actions** (`.github/workflows/deploy.yml`) compilará o projeto automaticamente e criará/atualizará a branch **`gh-pages`** com os arquivos finais compilados.
2. No seu repositório no GitHub:
   - Vá em **Settings** (Configurações) > **Pages** (no menu lateral esquerdo).
   - Em **Build and deployment** > **Source**, selecione **"Deploy from a branch"**.
   - Em **Branch**, selecione **`gh-pages`** e a pasta **/ (root)**.
   - Clique em **Save** (Salvar).
3. Seu sistema estará funcionando perfeitamente, sem tela em branco!

### Opção 2: Pelo Terminal / Linha de Comando
Se preferir publicar diretamente do seu computador:
```bash
npm run deploy
```
Esse comando compila a aplicação (`npm run build`) e envia os arquivos prontos diretamente para a branch `gh-pages` do seu repositório no GitHub.


---

## ⌨️ Atalhos Principais
- **F1**: Ajuda e Atalhos
- **F2** ou **Alt+1**: Hóspedes
- **F3** ou **Alt+2**: Quartos
- **F4** ou **Alt+3**: Tarifário / Diárias
- **F5** ou **Alt+4**: Calendário de Reservas
- **F7**: Emissor de Comprovante TXT
- **Ctrl+N**: Novo Cadastro de Hóspede
- **Ctrl+F**: Localizar / Filtrar
- **Ctrl+S**: Sincronização / Salvar
