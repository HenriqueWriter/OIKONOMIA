
/* =====================================================
   1. VARIÁVEIS GLOBAIS
===================================================== */

let totalGastosDia = 0;

let datas = [];
let valores = [];

let historicoGastos = [];

let despesasFixas = [];
let indiceEdicao = null;

let saldoLivre = 0;
let saldoLivreReal = 0;

let modeloAtual = null;
let porcentagensAtuais = null;

let indiceEdicaoGasto = null;

/* =====================================================
   2. CACHE DE 30 DIAS
===================================================== */

const CHAVE_CACHE = 'sistemaFinanceiro_cache';

const TEMPO_CACHE = 30 * 24 * 60 * 60 * 1000;


/* =====================================================
   3. FUNÇÕES DE MOEDA
===================================================== */

function converterValor(valor) {

    if (typeof valor !== 'string') {
        valor = String(valor);
    }

    return Number(
        valor.replace(/\./g, '').replace(',', '.')
    );

}


function formatarMoeda(valor) {

    return Number(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

}


function formatarMoedaCompleta(valor) {

    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

}


/* =====================================================
   4. DATA ATUAL
===================================================== */

function obterDataAtual() {

    const agora = new Date();

    const ano = agora.getFullYear();

    const mes = String(agora.getMonth() + 1).padStart(2, '0');

    const dia = String(agora.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;

}


/* =====================================================
   RECUPERAR DATA DO GASTO
===================================================== */

function obterDataRegistro(item) {

    if (item.dataISO) {
        return item.dataISO;
    }

    if (item.timestamp) {

        const data = new Date(item.timestamp);

        const ano = data.getFullYear();

        const mes = String(data.getMonth() + 1).padStart(2, '0');

        const dia = String(data.getDate()).padStart(2, '0');

        return `${ano}-${mes}-${dia}`;

    }

    return obterDataAtual();

}


/* =====================================================
   FORMATAR DATA BRASILEIRA
===================================================== */

function formatarData(dataISO) {

    if (!dataISO) return '';

    const [ano, mes, dia] = dataISO.split('-');

    return `${dia}/${mes}/${ano}`;

}


/* =====================================================
   5. SALVAR CACHE
===================================================== */

function salvarDados() {

    const dados = {

        salvoEm: Date.now(),

        totalGastosDia,

        datas,
        valores,

        historicoGastos,

        despesasFixas,

        saldoLivre,

        modeloAtual,
        porcentagensAtuais

    };

    try {

        localStorage.setItem(
            CHAVE_CACHE,
            JSON.stringify(dados)
        );

    } catch (erro) {

        console.error('Erro ao salvar cache:', erro);

    }

}


/* =====================================================
   6. CARREGAR CACHE
===================================================== */

function carregarDados() {

    try {

        const cache = localStorage.getItem(CHAVE_CACHE);

        if (!cache) return;

        const dados = JSON.parse(cache);

        if (
            !dados.salvoEm ||
            Date.now() - dados.salvoEm > TEMPO_CACHE
        ) {

            localStorage.removeItem(CHAVE_CACHE);

            return;

        }

        historicoGastos = Array.isArray(dados.historicoGastos)
            ? dados.historicoGastos
            : [];

        // Recuperar apenas gastos dos últimos 30 dias
        const limite = Date.now() - TEMPO_CACHE;

        historicoGastos = historicoGastos.filter(item => {

            const timestamp = Number(item.timestamp);

            return Number.isFinite(timestamp) &&
                timestamp >= limite;

        });

        despesasFixas = Array.isArray(dados.despesasFixas)
            ? dados.despesasFixas
            : [];

        saldoLivre = Number(dados.saldoLivre) || 0;

        modeloAtual = dados.modeloAtual || null;

        porcentagensAtuais =
            Array.isArray(dados.porcentagensAtuais)
                ? dados.porcentagensAtuais
                : null;

        // Recalcular gastos do dia
        recalcularHistorico();

    } catch (erro) {

        console.error('Erro ao carregar cache:', erro);

        localStorage.removeItem(CHAVE_CACHE);

    }

}


/* =====================================================
   7. GRÁFICO DE GASTOS
===================================================== */

const canvasGrafico = document.getElementById('graficoGastos');

if (!canvasGrafico) {
    throw new Error('Canvas graficoGastos não encontrado no HTML.');
}

const ctx = canvasGrafico.getContext('2d');

const grafico = new Chart(ctx, {

    type: 'line',

    data: {

        labels: datas,

        datasets: [

            {
                label: 'Soma dos Gastos',

                data: valores,

                borderColor: '#4287f5',

                backgroundColor: 'rgba(66,135,245,0.2)',

                pointRadius: 6,

                fill: true,

                tension: 0.4
            },

            {
                label: 'Limite do Gasto Livre',

                data: [],

                borderColor: '#FFD700',

                backgroundColor: 'transparent',

                borderWidth: 2,

                pointRadius: 0,

                borderDash: [6, 4],

                fill: false,

                tension: 0
            },

            {
                label: 'Limite da Reserva',

                data: [],

                borderColor: '#ff3333',

                backgroundColor: 'transparent',

                borderWidth: 2,

                pointRadius: 0,

                borderDash: [6, 4],

                fill: false,

                tension: 0
            }

        ]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

            legend: {

                labels: {
                    color: '#ffffff'
                }

            }

        },

        scales: {

            x: {

                ticks: {
                    color: '#ffffff'
                }

            },

            y: {

                beginAtZero: true,

                ticks: {

                    color: '#ffffff',

                    callback: function (value) {

                        return 'R$ ' + formatarMoeda(value);

                    }

                }

            }

        }

    }

});


/* =====================================================
   8. MÁSCARAS DE MOEDA
===================================================== */

function aplicarMascaraMoeda(campo, permitirVazio = false) {

    let valor = campo.value.replace(/\D/g, '');

    if (valor === '') {

        campo.value = permitirVazio ? '' : '0,00';

        return;

    }

    valor = (parseInt(valor, 10) / 100).toFixed(2);

    campo.value = valor.replace('.', ',');

}


function mascaraMoeda(campo) {

    aplicarMascaraMoeda(campo);

}


function mascaraDespesa(campo) {

    aplicarMascaraMoeda(campo);

}


function mascaraSaldo(campo) {

    aplicarMascaraMoeda(campo, true);

}


/* =====================================================
   9. RECONSTRUIR HISTÓRICO
===================================================== */

function recalcularHistorico() {

    const hoje = obterDataAtual();

    const gastosPorData = {};

    historicoGastos.forEach(item => {

        const data = item.dataISO ||
            new Date(item.timestamp).toISOString().slice(0, 10);

        if (!gastosPorData[data]) {

            gastosPorData[data] = 0;

        }

        gastosPorData[data] += Number(item.valor) || 0;

    });

    // Limpar arrays sem perder referências
    datas.length = 0;

    valores.length = 0;

    const diasOrdenados = Object.keys(gastosPorData).sort();

    let acumulado = 0;

    diasOrdenados.forEach(data => {

        acumulado += gastosPorData[data];

        datas.push(formatarData(data));

        valores.push(Number(acumulado.toFixed(2)));

    });

    // Total gasto no dia atual
    totalGastosDia = Number(
        (gastosPorData[hoje] || 0).toFixed(2)
    );

}


/* =====================================================
   10. ELEMENTOS HTML
===================================================== */

// Gastos diários
const inputGasto = document.getElementById('gasto');

const tabelaGastos = document.querySelector(
    '#tabela-gastos tbody'
);

// Despesas fixas
const inputDescricao = document.getElementById('descrição_despesas');

const inputValor = document.getElementById('valor_despesas');

const btnAdicionar = document.getElementById('btn_AddDespesas');

const btnSalvarEdicao = document.getElementById('btn_SalvarEdicao');

const tabelaFixas = document.getElementById('tabelaFixas');

// Saldo
const inputSalario = document.getElementById('salario');

const campoSaldo = document.getElementById('campoSaldo');

const saldoExibido = document.getElementById('saldoExibido');

const valorSaldo = document.getElementById('valorSaldo');

const btnEditarSaldo = document.getElementById('btnEditarSaldo');


/* =====================================================
   11. ADICIONAR GASTO DIÁRIO
===================================================== */


/* =====================================================
   GASTOS DIÁRIOS - ADICIONAR
===================================================== */

function adicionarGasto() {

    const input = document.getElementById('gasto');

    const gasto = converterValor(input.value);

    if (!Number.isFinite(gasto) || gasto <= 0) {
        alert('Informe um valor válido.');
        return;
    }

    const data = new Date().toLocaleDateString('pt-BR');

    totalGastosDia += gasto;

    historicoGastos.push({
        valor: gasto,
        data: data,
        timestamp: Date.now()
    });

    // Atualizar valores do gráfico
    datas.push(data);
    valores.push(totalGastosDia);

    indiceEdicaoGasto = null;

    atualizarTabelaGastos();
    atualizarGrafico();
    atualizarStatus();

    input.value = '0,00';

    salvarDados();

}


/* =====================================================
   RESTAURAR / ATUALIZAR TABELA DE GASTOS
===================================================== */

function atualizarTabelaGastos() {

    const tbody = document.querySelector(
        '#tabela-gastos tbody'
    );

    tbody.innerHTML = '';

    historicoGastos.forEach((item, index) => {

        const tr = document.createElement('tr');

        const colunaValor = document.createElement('td');

        colunaValor.textContent =
            formatarMoedaCompleta(item.valor);

        const colunaData = document.createElement('td');

        colunaData.textContent = formatarData(
            obterDataRegistro(item)
        );

        const colunaAcoes = document.createElement('td');


        // BOTÃO EDITAR

        const btnEditar = document.createElement('button');

        btnEditar.type = 'button';

        btnEditar.innerHTML =
            '<i class="fa-solid fa-pen-to-square"></i>';

        btnEditar.title = 'Editar gasto';

        btnEditar.classList.add('btn-editar');

        btnEditar.addEventListener('click', function () {

            editarGasto(index);

        });


        // BOTÃO EXCLUIR

        const btnExcluir = document.createElement('button');

        btnExcluir.type = 'button';

        btnExcluir.innerHTML =
            '<i class="fa-solid fa-trash"></i>';

        btnExcluir.title = 'Excluir gasto';

        btnExcluir.classList.add('btn-excluir');

        btnExcluir.addEventListener('click', function () {

            excluirGasto(index);

        });


        colunaAcoes.appendChild(btnEditar);

        colunaAcoes.appendChild(btnExcluir);


        tr.appendChild(colunaValor);

        tr.appendChild(colunaData);

        tr.appendChild(colunaAcoes);

        tbody.appendChild(tr);

    });

}




/* =====================================================
   EDITAR GASTO - ALTERAR DATA POR ALERTA
===================================================== */

function editarGasto(index) {

    const gasto = historicoGastos[index];

    if (!gasto) return;

    const input = document.getElementById('gasto');

    // Preencher valor
    input.value = formatarMoeda(gasto.valor);

    // Recuperar data atual no formato brasileiro
    const dataAtual = formatarData(obterDataRegistro(gasto));

    // Solicitar nova data
    const novaData = prompt(
        'Informe a nova data (DD/MM/AAAA):',
        dataAtual
    );

    // Cancelou
    if (novaData === null) return;

    // Validar formato brasileiro
    const partes = novaData.trim().split('/');

    if (partes.length !== 3) {

        alert('Utilize o formato DD/MM/AAAA.');

        return;

    }

    const [dia, mes, ano] = partes.map(Number);

    // Validar existência da data
    const dataValidada = new Date(ano, mes - 1, dia);

    if (
        !Number.isInteger(dia) ||
        !Number.isInteger(mes) ||
        !Number.isInteger(ano) ||
        ano < 1000 ||
        dataValidada.getFullYear() !== ano ||
        dataValidada.getMonth() !== mes - 1 ||
        dataValidada.getDate() !== dia
    ) {

        alert('A data informada não existe.');

        return;

    }

    // Converter para ISO internamente
    const dataISO =
        `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    // Guardar data temporariamente
    gasto.dataISO = dataISO;

    indiceEdicaoGasto = index;

    document.getElementById('BtnGastosDia').style.display = 'none';

    document.getElementById('btnSalvarEdicaoGasto').style.display =
        'inline-block';

    input.focus();

}



/* =====================================================
   SALVAR EDIÇÃO DO GASTO
===================================================== */

function salvarEdicaoGasto() {

    if (indiceEdicaoGasto === null) return;

    const input = document.getElementById('gasto');

    const novoValor = converterValor(input.value);

    if (!Number.isFinite(novoValor) || novoValor <= 0) {

        alert('Informe um valor válido.');

        input.focus();

        return;

    }

    const gasto = historicoGastos[indiceEdicaoGasto];

    if (!gasto) return;

    // Atualizar valor
    gasto.valor = novoValor;

    // Atualizar data brasileira e ISO
    gasto.data = formatarData(gasto.dataISO);

    // Atualizar timestamp preservando a data escolhida
    const [ano, mes, dia] = gasto.dataISO.split('-').map(Number);

    gasto.timestamp = new Date(
        ano,
        mes - 1,
        dia,
        12
    ).getTime();

    // Recalcular histórico
    recalcularHistorico();

    // Atualizar tabela e gráfico
    atualizarTabelaGastos();

    atualizarGrafico();

    atualizarStatus();

    finalizarEdicaoGasto();

    salvarDados();

}

/* =====================================================
   EXCLUIR GASTO
===================================================== */

function excluirGasto(index) {

    const confirmar = confirm(
        'Deseja realmente excluir este gasto?'
    );

    if (!confirmar) return;

    if (indiceEdicaoGasto === index) {

        finalizarEdicaoGasto();

    }

    else if (
        indiceEdicaoGasto !== null &&
        indiceEdicaoGasto > index
    ) {

        indiceEdicaoGasto--;

    }

    historicoGastos.splice(index, 1);

    recalcularHistoricoGrafico();

    atualizarTabelaGastos();

    atualizarGrafico();

    atualizarStatus();

    salvarDados();

}


/* =====================================================
   RECALCULAR GRÁFICO E TOTAL
===================================================== */

function recalcularHistoricoGrafico() {

    totalGastosDia = 0;

    datas.length = 0;

    valores.length = 0;

    historicoGastos.forEach(item => {

        totalGastosDia += Number(item.valor) || 0;

        datas.push(item.data);

        valores.push(totalGastosDia);

    });

}


/* =====================================================
   FINALIZAR EDIÇÃO
===================================================== */

function finalizarEdicaoGasto() {

    indiceEdicaoGasto = null;

    document.getElementById('gasto').value = '0,00';

    document.getElementById('BtnGastosDia').style.display =
        'inline-block';

    document.getElementById('btnSalvarEdicaoGasto').style.display =
        'none';

}


/* =====================================================
   ENTER - GASTOS DO DIA
===================================================== */

const campoGasto = document.getElementById('gasto');

campoGasto.addEventListener('keydown', function (event) {

    if (event.key === 'Enter') {

        event.preventDefault();

        const btnSalvarEdicao = document.getElementById(
            'btnSalvarEdicaoGasto'
        );

        // Verificar se está editando um gasto
        if (
            btnSalvarEdicao &&
            btnSalvarEdicao.style.display !== 'none'
        ) {

            salvarEdicaoGasto();

        } else {

            adicionarGasto();

        }

    }

});


/* =====================================================
   13. ADICIONAR DESPESA FIXA
===================================================== */

function adicionarDespesa() {

    const descricao = inputDescricao.value.trim();

    const valor = converterValor(inputValor.value);

    if (!descricao) {

        alert('Informe o nome da despesa.');

        inputDescricao.focus();

        return;

    }

    if (!Number.isFinite(valor) || valor <= 0) {

        alert('Informe um valor válido.');

        inputValor.focus();

        return;

    }

    despesasFixas.push({

        descricao,

        valor

    });

    limparCampos();

    atualizarTabelaDespesas();

    atualizarSaldoReal();

    salvarDados();

}


/* =====================================================
   14. ATUALIZAR TABELA DE DESPESAS
===================================================== */

function atualizarTabelaDespesas() {

    tabelaFixas.innerHTML = '';

    despesasFixas.forEach((despesa, index) => {

        const linha = document.createElement('tr');

        const colunaDescricao = document.createElement('td');

        colunaDescricao.textContent = despesa.descricao;

        const colunaValor = document.createElement('td');

        colunaValor.textContent =
            'R$ ' + formatarMoeda(despesa.valor);

        const colunaAcoes = document.createElement('td');


        // Editar
        const btnEditar = document.createElement('button');

        btnEditar.type = 'button';

        btnEditar.innerHTML =
            '<i class="fa-solid fa-pen-to-square"></i>';

        btnEditar.title = 'Editar despesa';

        btnEditar.classList.add('btn-editar');

        btnEditar.addEventListener('click', () => {

            editarDespesa(index);

        });


        // Excluir
        const btnExcluir = document.createElement('button');

        btnExcluir.type = 'button';

        btnExcluir.innerHTML =
            '<i class="fa-solid fa-trash"></i>';

        btnExcluir.title = 'Excluir despesa';

        btnExcluir.classList.add('btn-excluir');

        btnExcluir.addEventListener('click', () => {

            excluirDespesa(index);

        });


        colunaAcoes.appendChild(btnEditar);

        colunaAcoes.appendChild(btnExcluir);

        linha.appendChild(colunaDescricao);

        linha.appendChild(colunaValor);

        linha.appendChild(colunaAcoes);

        tabelaFixas.appendChild(linha);

    });

    const totalDespesas = despesasFixas.reduce(
        (soma, despesa) => soma + despesa.valor,
        0
    );

    document.getElementById('totalDespesas').textContent =
        'TOTAL: R$ ' + formatarMoeda(totalDespesas);

}


/* =====================================================
   15. EDITAR DESPESA
===================================================== */

function editarDespesa(index) {

    const despesa = despesasFixas[index];

    inputDescricao.value = despesa.descricao;

    inputValor.value = formatarMoeda(despesa.valor);

    indiceEdicao = index;

    btnAdicionar.style.display = 'none';

    btnSalvarEdicao.style.display = 'inline-block';

}


/* =====================================================
   16. SALVAR EDIÇÃO
===================================================== */

function salvarEdicaoDespesa() {

    if (indiceEdicao === null) return;

    const descricao = inputDescricao.value.trim();

    const valor = converterValor(inputValor.value);

    if (!descricao) {

        alert('Informe o nome da despesa.');

        inputDescricao.focus();

        return;

    }

    if (!Number.isFinite(valor) || valor <= 0) {

        alert('Informe um valor válido.');

        inputValor.focus();

        return;

    }

    despesasFixas[indiceEdicao] = {

        descricao,

        valor

    };

    limparCampos();

    atualizarTabelaDespesas();

    atualizarSaldoReal();

    salvarDados();

}


/* =====================================================
   17. EXCLUIR DESPESA
===================================================== */

function excluirDespesa(index) {

    if (!confirm('Deseja realmente excluir esta despesa?')) {
        return;
    }

    despesasFixas.splice(index, 1);

    if (indiceEdicao === index) {

        limparCampos();

    } else if (
        indiceEdicao !== null &&
        indiceEdicao > index
    ) {

        indiceEdicao--;

    }

    atualizarTabelaDespesas();

    atualizarSaldoReal();

    salvarDados();

}


/* =====================================================
   18. LIMPAR CAMPOS
===================================================== */

function limparCampos() {

    inputDescricao.value = '';

    inputValor.value = '0,00';

    btnAdicionar.style.display = 'inline-block';

    btnSalvarEdicao.style.display = 'none';

    indiceEdicao = null;

}


/* =====================================================
   19. CALCULAR SALDO REAL
===================================================== */

function atualizarSaldoReal() {

    const totalDespesas = despesasFixas.reduce(
        (soma, despesa) => soma + despesa.valor,
        0
    );

    saldoLivreReal = Number(
        (saldoLivre - totalDespesas).toFixed(2)
    );

    valorSaldo.textContent =
        formatarMoedaCompleta(saldoLivreReal);

    atualizarGrafico();

    atualizarStatus();

    if (porcentagensAtuais !== null) {

        renderizarDistribuicao();

    }

    salvarDados();

}


/* =====================================================
   20. SALVAR SALDO LIVRE
===================================================== */

function salvarSaldo() {

    const valor = converterValor(inputSalario.value);

    if (
        inputSalario.value.trim() === '' ||
        !Number.isFinite(valor) ||
        valor < 0
    ) {

        alert('Informe um saldo válido.');

        inputSalario.focus();

        return;

    }

    saldoLivre = valor;

    atualizarSaldoReal();

    campoSaldo.style.display = 'none';

    saldoExibido.style.display = 'flex';

}


/* =====================================================
   21. EDITAR SALDO
===================================================== */

function editarSaldo() {

    inputSalario.value =
        saldoLivre.toFixed(2).replace('.', ',');

    campoSaldo.style.display = 'block';

    saldoExibido.style.display = 'none';

    inputSalario.focus();

}


/* =====================================================
   22. EVENTOS DE ENTRADA
===================================================== */

inputGasto.addEventListener('input', function () {

    mascaraMoeda(this);

});

inputValor.addEventListener('input', function () {

    mascaraDespesa(this);

});

inputSalario.addEventListener('input', function () {

    mascaraSaldo(this);

});

inputDescricao.addEventListener('keydown', executarAcaoDespesa);

inputValor.addEventListener('keydown', executarAcaoDespesa);

inputSalario.addEventListener('keydown', function (event) {

    if (event.key === 'Enter') {

        event.preventDefault();

        salvarSaldo();

    }

});

inputSalario.addEventListener('blur', function () {

    if (
        campoSaldo.style.display !== 'none' &&
        inputSalario.value.trim() !== ''
    ) {

        salvarSaldo();

    }

});

btnEditarSaldo.addEventListener('click', editarSaldo);

btnAdicionar.addEventListener('click', adicionarDespesa);

btnSalvarEdicao.addEventListener('click', salvarEdicaoDespesa);


function executarAcaoDespesa(event) {

    if (event.key === 'Enter') {

        event.preventDefault();

        if (indiceEdicao !== null) {

            salvarEdicaoDespesa();

        } else {

            adicionarDespesa();

        }

    }

}


/* =====================================================
   23. ELEMENTOS DOS MODELOS
===================================================== */

const modelo50 = document.getElementById('Modelo50_30_20');

const modelo70 = document.getElementById('Modelo70_30');

const modeloPersonalizado = document.getElementById('ModeloPersona');

const areaPersonalizada = document.getElementById('personalizarModelo');

const inputPercentualGasto = document.getElementById('porcentagemGasto');

const inputInvestimento = document.getElementById('porcentagemInvestimento');

const inputReserva = document.getElementById('porcentagemReserva');

const somaPorcentagens = document.getElementById('somaPorcentagens');

const btnAplicarPersonalizado = document.getElementById('btnAplicarPersonalizado');

const resultadoModelo = document.getElementById('resultadoModelo');

const tituloModelo = document.getElementById('tituloModelo');

const listaDistribuicao = document.getElementById('listaDistribuicao');


/* =====================================================
   24. ELEMENTOS DO STATUS
===================================================== */

const porcentagemStatus = document.getElementById('porcentagemStatus');

const mensagemStatus = document.getElementById('mensagemStatus');


/* =====================================================
   25. VERIFICAR SALDO
===================================================== */

function verificarSaldo() {

    if (
        !Number.isFinite(saldoLivreReal) ||
        saldoLivreReal <= 0
    ) {

        alert(
            'Seu saldo livre real está zerado ou negativo. Verifique o saldo e as despesas fixas.'
        );

        return false;

    }

    return true;

}


/* =====================================================
   26. LIMPAR SELEÇÃO DOS MODELOS
===================================================== */

function limparSelecaoModelos() {

    modelo50.classList.remove('modelo-ativo');

    modelo70.classList.remove('modelo-ativo');

    modeloPersonalizado.classList.remove('modelo-ativo');

}


/* =====================================================
   27. EXIBIR DISTRIBUIÇÃO
===================================================== */

function renderizarDistribuicao() {

    if (
        !porcentagensAtuais ||
        saldoLivreReal <= 0
    ) {

        resultadoModelo.style.display = 'none';

        return;

    }

    resultadoModelo.style.display = 'block';

    tituloModelo.textContent = modeloAtual;

    listaDistribuicao.innerHTML = '';

    porcentagensAtuais.forEach(item => {

        const valorCalculado =
            saldoLivreReal * (item.porcentagem / 100);

        const linha = document.createElement('div');

        linha.classList.add('item-distribuicao');

        const nome = document.createElement('span');

        nome.textContent = item.nome;

        const porcentagem = document.createElement('span');

        porcentagem.textContent = item.porcentagem + '%';

        const valor = document.createElement('strong');

        valor.textContent =
            formatarMoedaCompleta(valorCalculado);

        linha.appendChild(nome);

        linha.appendChild(porcentagem);

        linha.appendChild(valor);

        listaDistribuicao.appendChild(linha);

    });

}


/* =====================================================
   28. CALCULAR DISTRIBUIÇÃO
===================================================== */

function calcularDistribuicao(modelo, porcentagens) {

    if (!verificarSaldo()) {

        resultadoModelo.style.display = 'none';

        return;

    }

    modeloAtual = modelo;

    porcentagensAtuais = porcentagens;

    renderizarDistribuicao();

    atualizarGrafico();

    salvarDados();

}


/* =====================================================
   29. MODELO 50-30-20
===================================================== */

modelo50.addEventListener('click', function () {

    if (!verificarSaldo()) return;

    limparSelecaoModelos();

    modelo50.classList.add('modelo-ativo');

    areaPersonalizada.style.display = 'none';

    calcularDistribuicao('Modelo 50-30-20', [

        {
            nome: 'Gasto Livre',
            porcentagem: 50
        },

        {
            nome: 'Investimento',
            porcentagem: 30
        },

        {
            nome: 'Reserva',
            porcentagem: 20
        }

    ]);

});


/* =====================================================
   30. MODELO 70-30
===================================================== */

modelo70.addEventListener('click', function () {

    if (!verificarSaldo()) return;

    limparSelecaoModelos();

    modelo70.classList.add('modelo-ativo');

    areaPersonalizada.style.display = 'none';

    calcularDistribuicao('Modelo 70-30', [

        {
            nome: 'Gasto Livre',
            porcentagem: 70
        },

        {
            nome: 'Investimento',
            porcentagem: 30
        }

    ]);

});


/* =====================================================
   31. MODELO PERSONALIZADO
===================================================== */

modeloPersonalizado.addEventListener('click', function () {

    limparSelecaoModelos();

    modeloPersonalizado.classList.add('modelo-ativo');

    resultadoModelo.style.display = 'none';

    areaPersonalizada.style.display = 'block';

});


/* =====================================================
   32. VALIDAR PORCENTAGENS
===================================================== */

function validarPorcentagens() {

    const gasto = Number(inputPercentualGasto.value);

    const investimento = Number(inputInvestimento.value);

    const reserva = Number(inputReserva.value);

    const lista = [
        gasto,
        investimento,
        reserva
    ];

    if (lista.some(valor =>
        !Number.isFinite(valor) ||
        valor < 0 ||
        valor > 100
    )) {

        somaPorcentagens.textContent =
            'Informe valores entre 0 e 100%.';

        somaPorcentagens.style.color = '#ff4444';

        return false;

    }

    const total = gasto + investimento + reserva;

    somaPorcentagens.textContent =
        'Total: ' + total + '%';

    if (Math.abs(total - 100) < 0.000001) {

        somaPorcentagens.style.color = '#53d7ff';

        return true;

    }

    somaPorcentagens.style.color = '#ff4444';

    return false;

}


/* =====================================================
   33. EVENTOS DAS PORCENTAGENS
===================================================== */

inputPercentualGasto.addEventListener(
    'input',
    validarPorcentagens
);

inputInvestimento.addEventListener(
    'input',
    validarPorcentagens
);

inputReserva.addEventListener(
    'input',
    validarPorcentagens
);


/* =====================================================
   34. APLICAR MODELO PERSONALIZADO
===================================================== */

btnAplicarPersonalizado.addEventListener('click', function () {

    if (!verificarSaldo()) return;

    if (!validarPorcentagens()) {

        alert(
            'A soma das porcentagens precisa ser exatamente 100%.'
        );

        return;

    }

    limparSelecaoModelos();

    modeloPersonalizado.classList.add('modelo-ativo');

    areaPersonalizada.style.display = 'block';

    calcularDistribuicao('Modelo Personalizado', [

        {
            nome: 'Gasto Livre',
            porcentagem: Number(inputPercentualGasto.value)
        },

        {
            nome: 'Investimento',
            porcentagem: Number(inputInvestimento.value)
        },

        {
            nome: 'Reserva',
            porcentagem: Number(inputReserva.value)
        }

    ]);

});


/* =====================================================
   35. ATUALIZAR GRÁFICO
===================================================== */

function atualizarGrafico() {

    if (!grafico) return;

    // Sincronizar os dados principais
    // Isso também corrige a recuperação do cache

    grafico.data.labels = datas;

    grafico.data.datasets[0].data = valores;


    // Verificar modelo e saldo

    if (!porcentagensAtuais || saldoLivreReal <= 0) {

        grafico.data.datasets[1].data = [];

        grafico.data.datasets[2].data = [];

        grafico.update();

        return;

    }


    const porcentagemGasto =
        porcentagensAtuais.find(item =>
            item.nome === 'Gasto Livre'
        )?.porcentagem || 0;


    const porcentagemInvestimento =
        porcentagensAtuais.find(item =>
            item.nome === 'Investimento'
        )?.porcentagem || 0;


    // Limite amarelo
    const limiteAmarelo =
        saldoLivreReal * (porcentagemGasto / 100);


    // Limite vermelho
    const limiteVermelho =
        saldoLivreReal * (
            (porcentagemGasto + porcentagemInvestimento) / 100
        );


    // Atualizar linha amarela
    grafico.data.datasets[1].data =
        datas.map(() => limiteAmarelo);


    // Atualizar linha vermelha
    grafico.data.datasets[2].data =
        datas.map(() => limiteVermelho);


    grafico.update();

}


/* =====================================================
   36. ATUALIZAR STATUS FINANCEIRO
===================================================== */

function atualizarStatus() {

    if (
        !Number.isFinite(saldoLivreReal) ||
        saldoLivreReal <= 0
    ) {

        porcentagemStatus.textContent = '0%';

        mensagemStatus.textContent =
            'SEM SALDO DISPONÍVEL';

        mensagemStatus.style.color = '#ff4444';

        return;

    }


    // Somente gastos de hoje
    const percentual =
        (totalGastosDia / saldoLivreReal) * 100;


    porcentagemStatus.textContent =
        percentual.toFixed(2).replace('.', ',') + '%';


    if (percentual <= 50) {

        mensagemStatus.textContent = 'NORMAL';

        mensagemStatus.style.color = '#00ff88';

    }

    else if (percentual <= 100) {

        mensagemStatus.textContent = 'CUIDADO!';

        mensagemStatus.style.color = '#ffcc00';

    }

    else {

        mensagemStatus.textContent = 'CRÍTICO!';

        mensagemStatus.style.color = '#ff4444';

    }

}


/* =====================================================
   37. INICIALIZAÇÃO DO SISTEMA
===================================================== */

function inicializarSistema() {

    // 1. Recuperar cache
    carregarDados();


    // 2. Restaurar campos
    limparCampos();

    inputGasto.value = '0,00';

    inputValor.value = '0,00';


    // 3. Restaurar despesas fixas
    atualizarTabelaDespesas();


    // 4. Restaurar histórico de gastos
    atualizarTabelaGastos();


    // 5. Restaurar saldo
    valorSaldo.textContent =
        formatarMoedaCompleta(saldoLivre);

    campoSaldo.style.display = 'none';

    saldoExibido.style.display = 'flex';


    // 6. Restaurar modelo selecionado
    limparSelecaoModelos();

    if (modeloAtual === 'Modelo 50-30-20') {

        modelo50.classList.add('modelo-ativo');

        areaPersonalizada.style.display = 'none';

    }

    else if (modeloAtual === 'Modelo 70-30') {

        modelo70.classList.add('modelo-ativo');

        areaPersonalizada.style.display = 'none';

    }

    else if (modeloAtual === 'Modelo Personalizado') {

        modeloPersonalizado.classList.add('modelo-ativo');

        areaPersonalizada.style.display = 'block';

    }


    // 7. Restaurar percentuais personalizados
    if (porcentagensAtuais) {

        porcentagensAtuais.forEach(item => {

            if (item.nome === 'Gasto Livre') {

                inputPercentualGasto.value = item.porcentagem;

            }

            if (item.nome === 'Investimento') {

                inputInvestimento.value = item.porcentagem;

            }

            if (item.nome === 'Reserva') {

                inputReserva.value = item.porcentagem;

            }

        });

    }


    // 8. Recalcular histórico
    recalcularHistorico();


    // 9. Recalcular saldo real
    const totalDespesas = despesasFixas.reduce(
        (soma, despesa) => soma + despesa.valor,
        0
    );

    saldoLivreReal = Number(
        (saldoLivre - totalDespesas).toFixed(2)
    );


    // 10. Atualizar exibição do saldo
    valorSaldo.textContent =
        formatarMoedaCompleta(saldoLivreReal);


    // 11. Restaurar distribuição
    if (
        porcentagensAtuais !== null &&
        saldoLivreReal > 0
    ) {

        renderizarDistribuicao();

    } else {

        resultadoModelo.style.display = 'none';

    }


    // 12. Atualizar gráfico
    atualizarGrafico();


    // 13. Atualizar status
    atualizarStatus();


    // 14. Validar percentuais
    validarPorcentagens();


    // 15. Salvar estado atualizado
    salvarDados();

}


/* =====================================================
   38. INICIAR SISTEMA
===================================================== */

inicializarSistema();


/* =====================================================
   39. MANTER CACHE ATUALIZADO
===================================================== */

// Salvar quando a página for fechada ou ocultada
document.addEventListener('visibilitychange', function () {

    if (document.visibilityState === 'hidden') {

        salvarDados();

    }

});

window.addEventListener('pagehide', function () {

    salvarDados();

});
