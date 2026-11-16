
(function () {

    const btnRelatorio =
        document.getElementById('btnRelatorio');

    if (!btnRelatorio) return;

    btnRelatorio.addEventListener('click', gerarRelatorio);


    function gerarRelatorio() {

        // =========================================
        // 1. CALCULAR INFORMAÇÕES
        // =========================================

        const totalDespesas = despesasFixas.reduce(
            (soma, despesa) => soma + Number(despesa.valor || 0),
            0
        );

        const totalGastos = historicoGastos.reduce(
            (soma, item) => soma + Number(item.valor || 0),
            0
        );

        const percentualStatus =
            saldoLivreReal > 0
                ? (totalGastosDia / saldoLivreReal) * 100
                : 0;

        let statusAtual = 'NORMAL';
        let corStatus = '#00b86b';

        const limiteAmarelo =
            porcentagensAtuais?.find(item =>
                item.nome === 'Gasto Livre'
            )?.porcentagem ?? 50;

        const limiteVermelho =
            limiteAmarelo +
            (
                porcentagensAtuais?.find(item =>
                    item.nome === 'Investimento'
                )?.porcentagem ?? 30
            );

        if (saldoLivreReal <= 0) {

            statusAtual = 'SEM SALDO DISPONÍVEL';
            corStatus = '#ff4444';

        }

        else if (percentualStatus <= 50) {

            statusAtual = 'NORMAL';
            corStatus = '#00b86b';

        }

        else if (percentualStatus < limiteVermelho) {

            statusAtual = 'CUIDADO!';
            corStatus = '#e5a900';

        }

        else {

            statusAtual = 'CRÍTICO!';
            corStatus = '#e53935';

        }


        // =========================================
        // 2. MONTAR HISTÓRICO
        // =========================================

        let linhasTabela = '';

        historicoGastos.forEach(item => {

            const percentual =
                totalGastos > 0
                    ? ((item.valor / totalGastos) * 100)
                        .toFixed(2)
                        .replace('.', ',')
                    : '0,00';

            linhasTabela += `
                <tr>
                    <td>
                        ${formatarData(obterDataRegistro(item))}
                    </td>

                    <td>
                        ${formatarMoedaCompleta(item.valor)}
                    </td>

                    <td>
                        ${percentual}%
                    </td>
                </tr>
            `;

        });


        // =========================================
        // 3. MONTAR RELATÓRIO
        // =========================================

        const html = `
        <!DOCTYPE html>

        <html lang="pt-BR">

        <head>

            <meta charset="UTF-8">

            <meta name="viewport" content="width=device-width, initial-scale=1">

            <title>Relatório Financeiro - OIKONOMIA</title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    padding: 30px;
                    background: #ffffff;
                    font-family: Arial, sans-serif;
                    color: #222;
                }

                /* CABEÇALHO */

                .cabecalho {
                    width: 100%;
                    text-align: center;
                    border-bottom: 4px solid #222;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }

                .cabecalho h1 {
                    font-size: 48px;
                    font-weight: 900;
                    letter-spacing: 5px;
                    margin: 0 0 10px;
                }

                .cabecalho p {
                    font-size: 15px;
                    margin: 0;
                    color: #555;
                }

                /* INFORMAÇÕES */

                .titulo-secao {
                    font-size: 21px;
                    margin-bottom: 18px;
                }

                .topo {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 35px;
                }

                .caixa {
                    padding: 22px 15px;
                    background: #f4f6f8;
                    border: 2px solid #333;
                    border-radius: 15px;
                    text-align: center;
                }

                .caixa strong {
                    display: block;
                    font-size: 14px;
                    margin-bottom: 12px;
                    color: #555;
                }

                .caixa span {
                    font-size: 23px;
                    font-weight: bold;
                }

                /* STATUS COMPLETO */

                .status-container {
                    border: 2px solid #333;
                    border-radius: 15px;
                    padding: 20px;
                    margin-bottom: 35px;
                }

                .status-container h2 {
                    margin: 0 0 20px;
                    font-size: 22px;
                }

                .status-principal {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                }

                .status-percentual {
                    font-size: 34px;
                    font-weight: bold;
                }

                .status-badge {
                    padding: 12px 25px;
                    border-radius: 10px;
                    color: white;
                    font-weight: bold;
                    font-size: 19px;
                    background: ${corStatus};
                }

                .barra-fundo {
                    height: 16px;
                    background: #ddd;
                    border-radius: 20px;
                    margin-top: 20px;
                    overflow: hidden;
                }

                .barra-preenchimento {
                    height: 100%;
                    width: ${Math.min(percentualStatus, 100)}%;
                    background: ${corStatus};
                    border-radius: 20px;
                }

                .legenda {
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 18px;
                }

                .legenda-item {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    font-size: 13px;
                    font-weight: bold;
                }

                .cor {
                    width: 13px;
                    height: 13px;
                    border-radius: 50%;
                }

                .normal {
                    background: #00b86b;
                }

                .cuidado {
                    background: #e5a900;
                }

                .critico {
                    background: #e53935;
                }

                /* TABELA */

                .historico-titulo {
                    font-size: 22px;
                    margin-bottom: 15px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                }

                thead {
                    background: #333;
                    color: white;
                }

                th, td {
                    border: 1px solid #444;
                    padding: 13px;
                    text-align: center;
                }

                tbody tr:nth-child(even) {
                    background: #f2f2f2;
                }

                /* RODAPÉ */

                .rodape {
                    margin-top: 25px;
                    padding: 18px;
                    background: #f4f6f8;
                    border: 2px solid #333;
                    border-radius: 12px;
                    text-align: right;
                    font-size: 20px;
                    font-weight: bold;
                }

                .data-relatorio {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #777;
                }

                @media print {

                    body {
                        padding: 10px;
                    }

                    .caixa,
                    .status-container,
                    .rodape {
                        break-inside: avoid;
                    }

                    .status-badge {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .barra-preenchimento,
                    .normal,
                    .cuidado,
                    .critico,
                    thead,
                    .caixa {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                }

                @media screen and (max-width: 650px) {

                    body {
                        padding: 15px;
                    }

                    .topo {
                        grid-template-columns: 1fr;
                    }

                    .cabecalho h1 {
                        font-size: 34px;
                    }

                }

            </style>

        </head>

        <body>

            <!-- CABEÇALHO -->

            <header class="cabecalho">

                <h1>OIKONOMIA</h1>

                <p>RELATÓRIO DE CONTROLE FINANCEIRO</p>

            </header>


            <!-- INFORMAÇÕES FINANCEIRAS -->

            <h2 class="titulo-secao">
                Resumo financeiro
            </h2>

            <div class="topo">

                <div class="caixa">

                    <strong>Saldo Livre Inicial</strong>

                    <span>
                        ${formatarMoedaCompleta(saldoLivre)}
                    </span>

                </div>

                <div class="caixa">

                    <strong>Despesas Fixas</strong>

                    <span>
                        ${formatarMoedaCompleta(totalDespesas)}
                    </span>

                </div>

                <div class="caixa">

                    <strong>Saldo Livre Real</strong>

                    <span>
                        ${formatarMoedaCompleta(saldoLivreReal)}
                    </span>

                </div>

            </div>


            <!-- STATUS COMPLETO -->

            <section class="status-container">

                <h2>Status Financeiro</h2>

                <div class="status-principal">

                    <div>

                        <div>
                            Percentual de gastos do dia
                        </div>

                        <div class="status-percentual">
                            ${percentualStatus.toFixed(2).replace('.', ',')}%
                        </div>

                    </div>

                    <div class="status-badge">
                        ${statusAtual}
                    </div>

                </div>

                <div class="barra-fundo">

                    <div class="barra-preenchimento"></div>

                </div>

                <div class="legenda">

                    <div class="legenda-item">
                        <span class="cor normal"></span>
                        NORMAL (0% a 50%)
                    </div>

                    <div class="legenda-item">
                        <span class="cor cuidado"></span>
                        CUIDADO (acima de 50% até 100%)
                    </div>

                    <div class="legenda-item">
                        <span class="cor critico"></span>
                        CRÍTICO (acima de 100%)
                    </div>

                </div>

            </section>


            <!-- HISTÓRICO -->

            <h2 class="historico-titulo">
                Histórico de Gastos
            </h2>

            <table>

                <thead>

                    <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>% do Total</th>
                    </tr>

                </thead>

                <tbody>

                    ${linhasTabela || `
                        <tr>
                            <td colspan="3">
                                Nenhum gasto registrado.
                            </td>
                        </tr>
                    `}

                </tbody>

            </table>


            <!-- TOTAL -->

            <div class="rodape">

                Total de Gastos:
                ${formatarMoedaCompleta(totalGastos)}

            </div>


            <div class="data-relatorio">

                Relatório gerado em:
                ${new Date().toLocaleString('pt-BR')}

            </div>

        </body>

        </html>
        `;


        // =========================================
        // 4. ABRIR IMPRESSÃO
        // =========================================

        const janela = window.open('', '_blank');

        if (!janela) {

            alert(
                'Não foi possível abrir o relatório. Verifique se o navegador permite janelas pop-up.'
            );

            return;

        }

        janela.document.open();

        janela.document.write(html);

        janela.document.close();

        janela.onload = function () {

            janela.focus();

            setTimeout(() => {

                janela.print();

            }, 500);

        };

    }

})();
