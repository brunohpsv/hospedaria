# Bloco de Notas - Gestão Hoteleira

Sistema ultra minimalista para gestão de hotéis, pousadas e vilas no estilo Bloco de Notas do Windows, com atalhos de teclado e alta produtividade.

---

## 🚀 Como Publicar no GitHub Pages

O projeto foi simplificado com caminhos relativos universais (`./`), funcionando perfeitamente no GitHub Pages.

### Opção 1: Automático via GitHub Actions (Recomendado)
1. Envie o código para o seu repositório:
   ```bash
   git add .
   git commit -m "Atualizacoes do sistema"
   git push origin main
   ```
2. No seu repositório no GitHub:
   - Vá em **Settings** > **Pages**.
   - Em **Source**, selecione **GitHub Actions**.
   - O fluxo configurado em `.github/workflows/deploy.yml` fará o build e publicação automaticamente.

### Opção 2: Manual via Linha de Comando (gh-pages)
Você também pode publicar diretamente executando:
```bash
npm run deploy
```
Esse comando compila o projeto e envia a pasta `dist` para a branch `gh-pages`.

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
