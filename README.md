# Bloco de Notas - Gestão Hoteleira

Sistema ultra minimalista para gestão de hotéis, pousadas e vilas no estilo Bloco de Notas do Windows, com atalhos de teclado e alta produtividade.

---

## 🚀 Como Publicar no GitHub Pages (Sem usar GitHub Actions)

O projeto agora gera automaticamente a pasta `/docs` pronta para publicação direta no GitHub Pages, sem consumir minutos do GitHub Actions.

### Passo a Passo:
1. Envie o código para o seu repositório no GitHub:
   ```bash
   git add .
   git commit -m "Publicar versao em /docs"
   git push origin main
   ```
2. No seu repositório no GitHub:
   - Vá em **Settings** (Configurações) > **Pages** (no menu lateral).
   - Em **Source** (Origem), escolha **"Deploy from a branch"**.
   - Em **Branch**, selecione `main` (ou `master`).
   - No campo da pasta ao lado da branch, selecione **/docs** e clique em **Save** (Salvar).
3. Pronto! Em instantes seu site estará no ar em:
   `https://brunohpsv.github.io/hospedaria/`


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
