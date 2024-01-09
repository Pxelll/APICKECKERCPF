const express = require("express");
const axios = require("axios");
const fs = require("fs");
const app = express();
const port = 3000;

app.use(express.json());

const apiUrl = "http://dbftools.tech/api/tools/search-cpf/";
const receitaApiUrl = "https://api.infosimples.com/api/v2/consultas/receita-federal/cpf";
const fixedToken = "7_XGwYMZbPqe1aHicRa05jpMvfeMhEoVbp3vaJCd";

app.post("/consulta", async (req, res) => {
  try {
    const { cpf } = req.body;

    if (!cpf) {
      return res.status(400).json({ error: "CPF é obrigatório." });
    }

    // Consulta na primeira API (apiUrl)
    const apiResponse = await axios.get(`${apiUrl}${cpf}`);

    // Extrai a data de nascimento da resposta da primeira API
    const { dataNascimento } = apiResponse.data;

    // Formata a data de nascimento para o formato esperado pela segunda API
    const formattedDataNascimento = new Date(dataNascimento).toISOString().split('T')[0];

    // Consulta na segunda API (receitaApiUrl)
    const receitaApiResponse = await axios.get(`${receitaApiUrl}?cpf=${cpf}&birthdate=${formattedDataNascimento}&token=${fixedToken}`);

    // Extrai a informação desejada da resposta da segunda API
    const situacaoCadastral = receitaApiResponse.data.data[0].situacao_cadastral;

    // Verifica se a situação cadastral é "REGULAR"
    if (situacaoCadastral !== "REGULAR") {
      return res.status(402).json({ error: "Situação cadastral Irregular"});
    }

    // Organiza os resultados finais incluindo dados da primeira API (apiUrl)
    const result = {
      situacaoCadastral,
      apiData: apiResponse.data,
    };

    // Log da requisição bem-sucedida
    const logMessage = `[${new Date().toISOString()}] Consulta bem-sucedida para CPF: ${cpf}\n`;
    fs.appendFile("successful_requests.log", logMessage, (err) => {
      if (err) {
        console.error("Erro ao escrever no arquivo de log:", err);
      }
    });

    // Pode manipular o resultado conforme necessário
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao consultar as APIs.");
  }
});

app.listen(port, () => {
  console.log(`Servidor está rodando na porta ${port}`);
});
