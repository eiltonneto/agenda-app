const multer = require("multer");
const path = require("path");
const crypto = require("crypto"); // Biblioteca nativa do Node para gerar nomes únicos

const storage = multer.diskStorage({
  // 1. ONDE SALVAR: Define que vai salvar na pasta "uploads" na raiz do backend
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, "..", "..", "uploads"));
  },
  // 2. QUAL NOME DAR: Gera um nome aleatório (ex: a1b2c3d4.jpg)
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(16).toString("hex");
    const extension = path.extname(file.originalname);
    cb(null, `${hash}${extension}`);
  }
});

module.exports = multer({ storage });