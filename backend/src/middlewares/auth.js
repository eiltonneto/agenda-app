import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      error: "Acesso negado. Token não fornecido." 
    });
  }

  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return res.status(401).json({ 
      error: "Formato de token inválido. Use 'Bearer [token]'" 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
  
  //AJUSTE: Conversão explícita para Number.
  //Como o seu Usuario.id no Prisma é Int, garantimos que req.userId 
  //chegue nas rotas pronto para ser usado em consultas do banco.
  
    req.userId = Number(decoded.id); 

    return next();
  } catch (err) {
    // Diferenciar erro de expiração ajuda o frontend a saber quando deslogar o usuário
    const message = err.name === "TokenExpiredError" 
      ? "Sua sessão expirou. Faça login novamente." 
      : "Token de autenticação inválido.";

    return res.status(401).json({ error: message });
  }
}