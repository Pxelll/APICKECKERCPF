const express = require("express");
const axios = require("axios");
const fs = require("fs/promises");

const app = express();
const apiUrl = "https://ws.hubdodesenvolvedor.com.br/v2/cpf/";
const situationalApiUrl = "http://34.171.167.8/api/tools/search-cpf/";
const fixedToken = "132747645BVjxnELSKr239671848";

app.use(express.json());

let successfulRequests = 0;
let processedData = new Set();

function getCurrentTimestamp() {
  const now = new Date();
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString();
  return `${formattedDate} ${formattedTime}`;
}

async function logSuccessfulRequest(cpf) {
  const timestamp = getCurrentTimestamp();
  const logMessage = `Requisição bem-sucedida para CPF ${cpf} em ${timestamp}\n`;

  try {
    await fs.appendFile("successful_requests.log", logMessage);
  } catch (err) {
    console.error("Erro ao escrever no arquivo de log:", err);
  }
}

app.post("/verificar-cpf", async (req, res) => {
  try {
    const { cpf, dataNascimento } = req.body;
    const apiRequestUrl = `${apiUrl}?cpf=${cpf}&data=${dataNascimento}&token=${fixedToken}`;

    let response;
    try {
      response = await axios.get(apiRequestUrl);
    } catch (error) {
      console.error("Erro na primeira API:", error);
      throw error;
    }

    if (response.status === 200 && response.data.status) {
      successfulRequests++;
      console.log(`Requisições bem-sucedidas: ${successfulRequests}`);
      processedData.add(cpf);

      // Formate a data para dd/mm/yy
      const formattedDateNascimento = new Date(response.data.dataNascimento).toLocaleDateString("pt-BR");

      const situationalStatusText = response.data.result.situacao_cadastral;

      if (situationalStatusText && situationalStatusText.toUpperCase().includes("REGULAR")) {
        await logSuccessfulRequest(cpf);
        
        // Chame a segunda API
        const situationalApiRequestUrl = `${situationalApiUrl}${cpf}`;
        let situationalApiResponse;
        try {
          situationalApiResponse = await axios.get(situationalApiRequestUrl);
        } catch (error) {
          console.error("Erro na segunda API:", error);
          throw error;
        }
        // Adicione a resposta da segunda API ao objeto retornado
        res.header("Content-Type", "application/json").json({ data: response.data, dataFromApi2: situationalApiResponse.data });
      } else {
        console.log("Situação cadastral da primeira API (erro):", situationalStatusText);
        res.status(402).header("Content-Type", "application/json").json({
          error: `CPF IRREGULAR - Situação cadastral: ${situationalStatusText || "Não disponível"}`,
          dataFromApi2: {},
        });
      }
    } else {
      console.log("Resposta da primeira API (erro):", response.data);
      res.status(400).header("Content-Type", "application/json").json({ error: "CPF Inválido ou Data de Nascimento inválida" });
    }
  } catch (error) {
    console.error("Erro geral:", error);
    handleApiError(error, res);
  }
});

function handleApiError(error, res) {
  if (error.code === "ECONNRESET") {
    res.status(502).header("Content-Type", "application/json").json({ error: "502 Bad Gateway - Conexão Resetada" });
  } else {
    res.status(500).header("Content-Type", "application/json").json({ error: "Erro interno no servidor" });
  }
}

const port = 3000;
app.listen(port, () => {
  console.log(`API intermediária rodando na porta ${port}`);
});
