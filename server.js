//server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const port = 3000;

const readline = require('readline');
const app = express();
app.use(cors());


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

app.get('/ListaPedidos', (req, res) => {
    db.all('SELECT * FROM pedidos', (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Erro interno do servidor');
        } else {
            res.json(rows);
        }
    });
});

const db = new sqlite3.Database('C:/Users/guigr/OneDrive/Área de Trabalho/novo trabalho/cafeteria');

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});

app.get('/ListaProdutos', (req, res) => {
    db.all('SELECT * FROM produtos', (err, rows) => {
        if (err) {
            console.error(err.message);
            res.status(500).send('Erro interno do servidor');
        } else {
            // Inclua o caminho completo da imagem
            const produtosComCaminho = rows.map(produto => ({
                ...produto,
                imagem_path: `http://localhost:3000/${produto.imagem_path}`
            }));
            res.json(produtosComCaminho);
        }
    });
});

app.options('/Cadastro', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.status(200).end();
});

app.options('/CadastroProduto', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.status(200).end();
});

app.post('/Cadastro', async (req, res) => {
    console.log('Corpo da Solicitação:', req.body);
    const { nome, email, telefone, endereco, complemento, senha } = req.body;

    // Verificar se os dados necessários foram fornecidos
    if (!nome || !email || !telefone || !endereco || !complemento || !senha) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    try {
        console.log('Verificando se o e-mail já existe...');
        // Verificar se o e-mail já existe no banco de dados
        const usuarioExistente = await new Promise( (resolve, reject) => {
            db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });

        if (usuarioExistente) {
            console.log('E-mail já cadastrado.');
            return res.status(409).json({ success: false, message: 'E-mail já cadastrado.' });
        }
             
        // Inserir dados na tabela 'usuarios'
        db.run('INSERT INTO usuarios (nome, email, telefone, endereco, complemento, senha) VALUES (?, ?, ?, ?, ?, ?)', [nome, email, telefone, endereco, complemento, senha], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erro ao cadastrar usuário.' });
            }

            console.log(`Usuário cadastrado com o ID ${this.lastID}`);
            res.status(201).json({ success: true, message: 'Usuário cadastrado com sucesso.', userId: this.lastID });
        });
        }
        catch (error) {
            console.error('Erro ao verificar e-mail existente:', error);
            res.status(500).json({ success: false, message: 'Erro interno ao cadastrar usuário.' });
        }
});

app.post('/CadastroProduto', async (req, res) => {
    const { nome, descricao, preco, imagem_path } = req.body;

    // Verificar se os dados necessários foram fornecidos
    if (!nome || !descricao || !preco) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    db.run(`
        INSERT INTO produtos (nome, descricao, preco, imagem_path)
        VALUES (?, ?, ?, ?)
    `, [nome, descricao, preco, imagem_path], function(err) {
        if (err) {
            console.error(err.message);
            res.status(500).send('Erro interno do servidor');
        } else {
            // Retornar o ID do produto recém-cadastrado
            res.json({ id: this.lastID });
        }
    });
});

app.delete('/ExcluirProduto/:id', (req, res) => {
    const id = parseInt(req.params.id);

    try {
        db.run('DELETE FROM produtos WHERE id = ?', [id], function(err) {
            if (err) {
                console.error(err.message);
                res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            } else if (this.changes === 0) {
                // Nenhuma linha afetada, o produto com o ID especificado não foi encontrado
                res.status(404).json({ success: false, message: 'Produto não encontrado.' });
            } else {
                res.json({ success: true, message: 'Produto excluído com sucesso.' });
            }
        });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

app.put('/AtualizarProduto/:id', (req, res) => {
    const { nome, descricao, preco, imagem_path } = req.body.dadosAtualizados;
    const id = req.params.id;

    // Verifique se os dados necessários foram fornecidos
    if (!nome || !descricao || !preco) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    // Atualize os dados do produto no banco de dados
    db.run(`
        UPDATE produtos
        SET nome = ?, descricao = ?, preco = ?, imagem_path = ?
        WHERE id = ?
    `, [nome, descricao, preco, imagem_path, id], function(err) {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor', error: err.message });
        }

        res.json({ success: true, message: 'Produto atualizado com sucesso.' });
    });
});


db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT,
        telefone TEXT,
        endereco TEXT,
        complemento TEXT,
        senha
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        descricao TEXT,
        preco REAL,
        imagem_path TEXT
    )
`);

db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_cliente TEXT,
        pedido TEXT,
        endereco_cliente TEXT,
        data TEXT,
        valor REAL
    )
`);


app.post('/Login', (req, res) => {
    const { email, senha, nome,endereco } = req.body;

    db.get('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email, senha], (err, row) => {
        console.log('Erro:', err);
        console.log('Resultado do Banco de Dados:', row);

        if (err) {
            return res.status(500).json({ autenticado: false, message: 'Erro ao autenticar usuário.' });
        }

        if (!row) {
            
            return res.status(401).json({ autenticado: false, message: 'Credenciais inválidas.' });
        }

        const { nome, endereco, email } = row;
        res.status(200).json({ autenticado: true, email: email, nome: nome, endereco: endereco, message: 'Login bem-sucedido!' });
    });
});

app.post('/FinalizarPedido', async (req, res) => {
    // Obtenha as informações do pedido do corpo da solicitação
    const { usuarioNome, formaPagamento, endereco, totalGeral, produtosDoPedido } = req.body;

    // Realize a inserção na tabela "pedidos"
    try {
        db.run(`
            INSERT INTO pedidos (nome_cliente, pedido, endereco_cliente, data, valor)
            VALUES (?, ?, ?, datetime('now', 'localtime'), ?)
        `, [usuarioNome, JSON.stringify(produtosDoPedido), endereco, totalGeral], function(err) {
            if (err) {
                console.error('Erro ao inserir pedido na tabela "pedidos":', err.message);
                res.status(500).json({ success: false, message: 'Erro interno do servidor' });
            } else {
                console.log(`Pedido inserido com o ID ${this.lastID} na tabela "pedidos"`);
                res.json({ success: true, message: 'Pedido finalizado com sucesso.' });
            }
        });
    } catch (error) {
        console.error('Erro ao inserir pedido na tabela "pedidos":', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

function gerarPrintPedido() {
    // Obtenha as informações necessárias do usuário e do pedido
    var usuarioNome = document.getElementById('nome-cliente-span').textContent;
    var formaPagamento = document.querySelector('input[name="formaPagamento"]:checked').value;

    // Obtenha os produtos do pedido
    var produtosDoPedido = JSON.parse(localStorage.getItem('produtosDoPedido'));

    // Crie um print do pedido detalhado
    

    if (produtosDoPedido && produtosDoPedido.length > 0) {
        var totalGeral = 0;
        var printPedido = `<div id="pedido-container">`;
        produtosDoPedido.forEach(produto => {
                       printPedido += `
                    <div class="produto-info">
                        <span class="nome-produto">${produto.nome}</span>
                        <span class="preco-quantidade">&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp${produto.preco} * ${produto.quantidade}</span>
                        <span class="subtotal">&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp${produto.preco * produto.quantidade}</span>
                    </div>`;
                 
            totalGeral += produto.preco * produto.quantidade;
        });

        printPedido += `
        <div class="total-container">
                <div class="info-label">valor Total &nbsp;&nbsp;&nbsp;&nbsp; ${totalGeral}<br></div>
            </div>
        </div>`
        printPedido += `
        <div class="endereco-pagamento-container">
        <br><div class="info-label-1">Endereço:</div>
        <br>${enderecoCheckbox.checked ? document.getElementById('endereco-cliente').textContent : endereco.value + ' ' + complemento.value}
            <br><div class="info-label-1">Forma de Pagamento: ${formaPagamento}</div>
        </div>`;
    }


    
    
    // Exiba o print do pedido no console (substitua pelo código para gerar um print real)
    console.log(printPedido);

    // Exiba as informações na área de detalhes do pedido
    document.getElementById('printPedido').innerHTML = printPedido;

    // Exiba o contêiner do pedido
    document.getElementById('printPedidoContainer').style.display = 'block';

    document.getElementById('printPedido').innerHTML = printPedido;

    document.getElementById('printPedidoContainer').style.display = 'block';
    
}

function enviarFormulario(event) {
    event.preventDefault();
    
    var nome = document.getElementById('nome').value;
    var email = document.getElementById('email').value;
    var telefone = document.getElementById('telefone').value;
    var endereco = document.getElementById('endereco').value;
    var complemento = document.getElementById('complemento').value;
    var senha = document.getElementById('senha').value;
    var confirmacaosenha = document.getElementById('confirmacaosenha').value;

    // Validar campos obrigatórios
    if (!nome || !email || !telefone || !endereco || !senha || !confirmacaosenha) {
        alert("Todos os campos, exceto complemento, são obrigatórios.");
        return;
    }

    // Validar a senha
    if (senha !== confirmacaosenha) {
        alert("As senhas estão diferentes.");
        return;
    }

    // Validar telefone (exemplo de validação, ajuste conforme necessário)
    if (telefone.length > 14) {
        alert("Telefone inválido.");
        return;
    }

    // Verificar se o e-mail já existe no banco de dados
    fetch(`http://localhost:3000/Cadastro/verificarEmail?email=${email}`)
        .then(response => response.json())
        .then(data => {
            if (data.existe) {
                alert("E-mail já cadastrado.");
            } else {
                // Enviar os dados para o servidor
                fetch('http://localhost:3000/Cadastro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nome: nome,
                        email: email,
                        telefone: telefone,
                        endereco: endereco,
                        complemento: complemento,
                        senha: senha,
                    }),
                })
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                })
                .catch(error => {
                    console.error('Erro ao enviar dados:', error);
                });
            }
        })
        .catch(error => {
            console.error('Erro ao verificar e-mail:', error);
        });
}

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Conexão com o banco de dados fechada.');
        process.exit(0);
    });
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});


