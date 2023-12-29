const express = require("express");
const axios = require("axios");
const fs = require("fs/promises");

const app = express();
const apiUrl = "https://ws.hubdodesenvolvedor.com.br/v2/cpf/";

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

    const response = await axios.get(apiRequestUrl);

    if (response.status === 200) {
      if (response.data.status) {
        successfulRequests++;
        console.log(`Requisições bem-sucedidas: ${successfulRequests}`);
        processedData.add(cpf);

        const apiUrl2 = "http://34.171.167.8/api/tools/search-cpf/";

        try {
          const response2 = await axios.get(apiUrl2 + cpf);

          if (response2.status === 200) {
            // Verifica se a situacao_cadastral é "REGULAR"
            if (response.data.result.situacao_cadastral === "REGULAR") {
              await logSuccessfulRequest(cpf, response.data, response2.data);
              res.json({ data: response.data, dataFromApi2: response2.data });
            } else {
              res.status(402).json({ error: "CPF IRREGULAR" });
            }
          } else {
            throw new Error(`Erro HTTP! status: ${response2.status}`);
          }
        } catch (error) {
          handleApiError(error, res);
        }
      } else {
        // Situation is irregular, send a specific message
        res.status(400).json({ error: "CPF Inválido ou Data de Nascimento " });
      }
    } else {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }
  } catch (error) {
    handleApiError(error, res);
  }
});

function handleApiError(error, res) {
  if (error.code === "ECONNRESET") {
    res.status(502).json({ error: "502 Bad Gateway - Conexão Resetada" });
  } else {
    res
      .status(error.response ? error.response.status : 500)
      .json({ error: "Erro ao verificar dados." });
  }
}

const port = 3000;
app.listen(port, () => {
  console.log(`API intermediária rodando na porta ${port}`);
});
