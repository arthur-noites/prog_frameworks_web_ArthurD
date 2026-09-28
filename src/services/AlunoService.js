const AlunoNaoEncontradoError = require("../errors/AlunoNaoEncontradoError");
const prisma = require("../databases/prisma");
const AlunoInvalidoError = require("../errors/AlunoInvalidoError");
const EmailDuplicadoError = require("../errors/EmailDuplicadoError");

class AlunoService {

    async findMany(page, pageSize, orderBy = "id", order = "asc") {
        // valida a direção da ordenação; se vier algo diferente de asc/desc, usa "asc" como padrão
        const direcaoValida = (order === "asc" || order === "desc") ? order : "asc";

        const alunos = await prisma.aluno.findMany({
            skip: (page - 1) * pageSize,
            take: Number(pageSize),
            orderBy: {
                [orderBy]: direcaoValida
            }
        });

        const total = await prisma.aluno.count();

        return { alunos, total };
    }

    async findUnique(id) {
        const idNumero = Number(id);
        if (Number.isNaN(idNumero)) {
            throw new AlunoInvalidoError("O id deve ser um número", 400);
        }

        const aluno = await prisma.aluno.findUnique({
            where: { id: idNumero }
        });

        if (!aluno) {
            throw new AlunoNaoEncontradoError();
        }

        return aluno;
    }

    async update(id, dados = {}) {
    const idNumero = Number(id);
    if (Number.isNaN(idNumero)) {
        throw new AlunoInvalidoError("O id deve ser um número", 400);
    }

    // Dados inválidos: reaproveita AlunoInvalidoError, pois é o mesmo tipo de problema
  
    const { nome, email } = dados;
    const data = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (Object.keys(data).length === 0) {
        throw new AlunoInvalidoError("Informe nome e/ou email para atualizar", 400);
    }

    // Aluno não encontrado: reaproveita a exceção do findUnique (404)
    const existente = await prisma.aluno.findUnique({ where: { id: idNumero } });
    if (!existente) {
        throw new AlunoNaoEncontradoError();
    }

    // Email duplicado: exceção própria, pois o status é diferente (409)
    // e o cliente precisa distinguir isso de um erro de validação comum
    if (data.email) {
        const outro = await prisma.aluno.findUnique({ where: { email: data.email } });
        if (outro && outro.id !== idNumero) {
            throw new EmailDuplicadoError();
        }
    }

    try {
        return await prisma.aluno.update({ where: { id: idNumero }, data });
    } catch (e) {
        // P2002 = violação de @unique no Prisma (cobre o caso de dois pedidos ao mesmo tempo)
        if (e.code === "P2002") {
            throw new EmailDuplicadoError();
        }
        throw e;
    }
}

    async create(aluno) {
        const { nome, email } = aluno;
        if (!nome || !email) {
            throw new AlunoInvalidoError();
        }
        const novoAluno = await prisma.aluno.create({ data: aluno });

        return novoAluno;
    }
}

module.exports = new AlunoService();