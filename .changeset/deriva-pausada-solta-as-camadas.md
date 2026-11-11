---
'convite-isa-e-neto': patch
---

Pausar a deriva do celular (ao aparecer o envelope, com o convite aberto ou no botão "Pausar animação") cancela as animações do navegador em vez de deixá-las pausadas: pausadas, elas mantinham dez camadas de tela cheia na GPU como um `will-change`, e o convite piscava no Motorola Edge 70 Fusion+ (ADR-0049). A camada fica no mesmo ponto, e retomar continua dali.
