
const express = require("express");
const fs = require("fs");
const nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const saldosPath = "./saldos.json";
const historialPath = "./historial.json";

// Cargar saldos y historial desde archivos
let saldos = fs.existsSync(saldosPath) ? JSON.parse(fs.readFileSync(saldosPath)) : {};
let historial = fs.existsSync(historialPath) ? JSON.parse(fs.readFileSync(historialPath)) : {};

// Guardar datos
function guardarDatos() {
  fs.writeFileSync(saldosPath, JSON.stringify(saldos));
  fs.writeFileSync(historialPath, JSON.stringify(historial));
}

// Notificar por correo (retiro)
async function enviarCorreo(wallet, monto, tipo = "BTC") {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "teudy58@gmail.com",
      pass: "clave-de-app-aqui"
    }
  });

  await transporter.sendMail({
    from: '"BTCMovil Notificación" <teudy58@gmail.com>',
    to: "teudy58@gmail.com",
    subject: `Nuevo Retiro - ${tipo}`,
    text: `Wallet: ${wallet}\nMonto: ${monto} ${tipo}\nFecha: ${new Date().toLocaleString()}`
  });
}

app.get("/", (req, res) => {
  res.send("🚀 Backend BTCMovil v2 funcionando");
});

app.post("/minar", (req, res) => {
  const { wallet, cantidad } = req.body;
  if (!wallet || !cantidad) return res.status(400).json({ error: "Faltan datos" });

  if (!saldos[wallet]) saldos[wallet] = 0;
  saldos[wallet] += cantidad;

  if (!historial[wallet]) historial[wallet] = [];
  historial[wallet].push({ tipo: "minado", cantidad, fecha: new Date().toISOString() });

  guardarDatos();
  res.json({ wallet, nuevoSaldo: saldos[wallet] });
});

app.get("/saldo/:wallet", (req, res) => {
  const wallet = req.params.wallet;
  const saldo = saldos[wallet] || 0;
  res.json({ wallet, saldo });
});

app.post("/retiro", async (req, res) => {
  const { wallet, monto } = req.body;
  if (!wallet || !monto) return res.status(400).json({ error: "Faltan datos" });

  if (!saldos[wallet] || saldos[wallet] < monto) {
    return res.status(400).json({ error: "Fondos insuficientes" });
  }

  saldos[wallet] -= monto;

  if (!historial[wallet]) historial[wallet] = [];
  historial[wallet].push({ tipo: "retiro", cantidad: monto, fecha: new Date().toISOString() });

  guardarDatos();
  await enviarCorreo(wallet, monto);
  res.json({ wallet, saldoRestante: saldos[wallet], mensaje: "Retiro solicitado" });
});

app.get("/historial/:wallet", (req, res) => {
  const wallet = req.params.wallet;
  res.json({ wallet, historial: historial[wallet] || [] });
});

app.post("/retiro-qik", async (req, res) => {
  const { wallet, montoDOP, cuentaQik } = req.body;
  if (!wallet || !montoDOP || !cuentaQik) return res.status(400).json({ error: "Faltan datos" });

  await enviarCorreo(wallet, montoDOP + " DOP a cuenta Qik: " + cuentaQik, "DOP");
  res.json({ mensaje: "Solicitud enviada. Será procesada manualmente." });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en puerto ${PORT}`);
});
