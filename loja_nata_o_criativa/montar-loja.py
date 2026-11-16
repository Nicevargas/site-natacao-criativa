# Monta a grade de produtos da página Loja a partir de dados-antigos/loja.json.
# Rode na raiz do projeto:  python loja_nata_o_criativa/montar-loja.py
import html
import io
import json

loja = json.load(io.open('dados-antigos/loja.json', encoding='utf8'))

# Mais vendidos na loja antiga (DragSox 14, Rotina 13, Dado Escrito 6)
MAIS = {'dragsox': 1, 'rotina-para-as-aulas-de-natacao': 2, 'dado-pedagogico-escrito-de-eva-para-natacao': 3}
CAT = {
    'Brinquedos': ('brinquedos', 'Brinquedo pedagógico', 'toys'),
    'Uniformes': ('uniformes', 'Uniforme', 'checkroom'),
    'Livros': ('livros', 'Livro', 'menu_book'),
    'Materiais de Natação': ('materiais', 'Material de natação', 'pool'),
}
CARD = 'flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(11,50,88,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(11,50,88,0.12)] transition-all duration-300 group'
BTN = 'px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg transition-all inline-flex items-center justify-center gap-1.5 shadow-sm'
PILULA = 'px-2.5 py-1 rounded-full text-label-caps font-label-caps uppercase tracking-wider shadow-sm'
e = html.escape


def preco(v):
    return 'R$ ' + ('%.2f' % v).replace('.', ',').replace(',00', '')


def resumo(item):
    t = item['resumo'] or item['descricao'] or ''
    if len(t) > 170:
        t = t[:170].rsplit(' ', 1)[0].rstrip(' ,.;:') + '…'
    return t


# mais vendidos primeiro; produtos sem foto por último
loja.sort(key=lambda item: (MAIS.get(item['slug'], 9), not item['foto'], item['nome'].lower()))

cards = []
for item in loja:
    chave, rotulo, icone = CAT[item['categoria']]
    if item['foto']:
        capa = '<img class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" src="/loja/fotos/%s" alt="%s" loading="lazy"/>' % (item['foto'], e(item['nome']))
    else:
        capa = '<span class="material-symbols-outlined absolute inset-0 m-auto h-fit w-fit text-outline-variant text-[72px]">%s</span>' % icone
    selo = '<span class="%s text-on-secondary-fixed bg-[#FAC61C]">Mais vendido</span>' % PILULA if item['slug'] in MAIS else ''
    t = resumo(item)
    paragrafo = '<p class="text-on-surface-variant font-body-sm text-body-sm">%s</p>' % e(t) if t else ''
    cards.append(
        '<article class="%s" data-cat="%s">\n' % (CARD, chave)
        + '<div class="relative h-56 w-full overflow-hidden bg-white">\n' + capa + '\n'
        + '<div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">\n'
        + '<span class="%s text-on-primary bg-primary-container">%s</span>\n%s\n</div>\n</div>\n' % (PILULA, rotulo, selo)
        + '<div class="p-space-lg flex-1 flex flex-col justify-between">\n<div class="space-y-2">\n'
        + '<h2 class="text-on-secondary-fixed font-headline-sm text-headline-sm group-hover:text-primary transition-colors">%s</h2>\n' % e(item['nome'])
        + paragrafo + '\n</div>\n'
        + '<div class="mt-6 bg-surface-container-low -mx-space-lg -mb-space-lg p-space-lg flex items-center justify-between gap-3"><div>'
        + '<span class="text-label-caps font-label-caps text-on-surface-variant uppercase block">Valor</span>'
        + '<span class="text-on-secondary-fixed font-headline-sm text-headline-sm">%s</span></div>' % preco(item['preco'])
        + '<a class="%s" href="/atendimento"><span>Tenho interesse</span><span class="material-symbols-outlined text-[16px]">shopping_bag</span></a></div>\n' % BTN
        + '</div></article>'
    )

caminho = 'loja_nata_o_criativa/code.html'
h = io.open(caminho, encoding='utf8', newline='').read()

# grade de produtos (entre o início da grade e o aviso de "nada encontrado")
ini = h.index('<div class="grid grid-cols-1 ')
ini_fim = h.index('>', ini) + 1
fim = h.index('<div class="bg-surface-container-low rounded-xl p-8 text-center max-w-3xl mx-auto mt-6" id="vazio"')
grade = '<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">'
h = h[:ini] + grade + '\n' + '\n'.join(cards) + '\n</div>\n' + h[fim:]

# filtros
CHIP = 'flex items-center gap-1.5 px-3.5 py-2 bg-surface-container-lowest rounded-full text-on-surface text-label-md font-label-md shadow-sm hover:bg-surface-container-high transition-all'
chips = [('todos', 'Todos', 'apps'), ('brinquedos', 'Brinquedos pedagógicos', 'toys'), ('uniformes', 'Uniformes', 'checkroom'), ('livros', 'Livros', 'menu_book'), ('materiais', 'Materiais de natação', 'pool')]
ci = h.index('<div class="flex flex-wrap items-center gap-2.5" id="chips">')
cf = h.index('</div></section>', ci)
botoes = '\n'.join(
    '<button class="%s%s" data-chip="%s" type="button"><span class="material-symbols-outlined text-[16px]">%s</span><span>%s</span></button>' % ('chip-ativo ' if i == 0 else '', CHIP, v, ic, r)
    for i, (v, r, ic) in enumerate(chips)
)
h = h[:ci] + '<div class="flex flex-wrap items-center gap-2.5" id="chips">\n' + botoes + '\n' + h[cf:]

# textos da página (só troca o que ainda estiver na versão antiga)
TROCAS = [
    ('E-books, planilhas e apostilas</div>', 'Brinquedos pedagógicos, uniformes e materiais</div>'),
    ('Materiais prontos para usar na sua próxima aula', 'Materiais para deixar a sua aula mais criativa'),
    ('Publicações autorais e ferramentas da Natação Criativa, com entrega digital.', 'Brinquedos pedagógicos de EVA, uniformes, livro e materiais de natação escolhidos pela Natação Criativa.'),
    ('placeholder="Buscar e-book, planilha, apostila..."', 'placeholder="Buscar brinquedo, jogo, touca, livro..."'),
    ('id="contador">6 materiais<', 'id="contador">%d produtos<' % len(loja)),
    ("'material':'materiais'", "'produto':'produtos'"),
    ('content="E-books, planilhas e apostilas da Natação Criativa."', 'content="Brinquedos pedagógicos, uniformes, livro e materiais de natação da Natação Criativa."'),
    ('>bolt</span></div><div><h3 class="text-on-secondary-fixed font-headline-sm text-headline-sm">Entrega digital<', '>inventory_2</span></div><div><h3 class="text-on-secondary-fixed font-headline-sm text-headline-sm">Catálogo completo<'),
    ('Você recebe o material por e-mail logo após a confirmação do pedido.', 'São %d itens, a maioria brinquedos pedagógicos para usar dentro e fora da piscina.' % len(loja)),
    ('>Compra segura<', '>Pedido pelo atendimento<'),
    ('O pedido é fechado com o atendimento, que envia o link de pagamento.', 'Você escolhe, e a equipe confirma disponibilidade, frete e forma de pagamento.'),
]
for antigo, novo in TROCAS:
    if antigo in h:
        h = h.replace(antigo, novo)

io.open(caminho, 'w', encoding='utf8', newline='').write(h)
print('produtos na página:', h.count('<article'), '| tamanho:', len(h) // 1024, 'KB')
