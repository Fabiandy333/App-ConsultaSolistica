const puppeteer = require("puppeteer");
const randomUseragent = require("random-useragent");
const fs = require("fs");
const { resolve } = require("path");
const path = require("path");

const express = require("express");

////////////////////////////////////////////////////////////////////////////////////////////
const app = express();
let remesaData = [];

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
////////////////////////////////////////////////////////////////////////////////////////////
app.get("/remesa-data", (req, res) => {
  res.json(remesaData);
});

// Segunda Función // Extrae Los Datos Por Su Numero De Remesa El Cual Ingresa En La Función
const inputRemesaSolistica = async (browser, page, nRemesa, intentos = 0) => {
  if (intentos >= 3) {
    console.error("Se han agotado los intentos. La página no se ha cargado.");
    return;
  }
  try {
    const header = randomUseragent.getRandom();
    await page.setUserAgent(header);
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(
      "https://status.solistica.com/Status/consulta_remesa.aspx",
      { timeout: 3000 }
    );
    await page.waitForSelector("#vREMISION", { timeout: 1000 });
    // Código a ejecutar si la página se carga correctamente

    const remesaInput = await page.waitForSelector("#vREMISION", {
      timeout: 15000,
    });
    await page.evaluate(() => {
      document.querySelector("#vREMISION").value = ""; // Limpiar el campo de entrada antes de escribir
    });
    await new Promise((resolve) => setTimeout(resolve, 100)); // Retardo de 100 milisegundos

    console.log("NúmeroP2: ", nRemesa);
    await page.click("#vREMISION");

    await remesaInput.type(nRemesa.toString());

    await page.click("#IMAGE2"); // Click en el botón de buscar en la remesa
    await page.waitForSelector(".gx-tab-padding-fix-1", { timeout: 1000 });
    await page.waitForSelector("#TABLE23", { timeout: 1000 });

    // Extracción de datos de la página

    const objCiudad = await page.$("#span_vCIUNMBDST"); // Objeto Ciudad
    const getCiudad = await page.evaluate(
      (objCiudad) => objCiudad.innerText,
      objCiudad
    ); // Extraer el innerText
    const objDireccion = await page.$("#span_vRMSDSTDRC"); // Objeto Dirección
    const getDireccion = await page.evaluate(
      (objDireccion) => objDireccion.innerText,
      objDireccion
    ); // Extraer el innerText
    const objEstado = await page.$("#span_vESTADOPED"); // Objeto Estado
    const getEstado = await page.evaluate(
      (objEstado) => objEstado.innerText,
      objEstado
    ); // Extraer el innerText
    const objCajas = await page.$("#span_vRMSUNDTOT"); // Objeto Cajas
    const getCajas = await page.evaluate(
      (objCajas) => objCajas.innerText,
      objCajas
    );
    // Extraer el innerText
    const objFechaEntregada = await page.$("#span_vFECHAENT"); // Objeto Fecha Entregada
    const getFechaEntregada = await page.evaluate(
      (objFechaEntregada) => objFechaEntregada.innerText,
      objFechaEntregada
    ); // Extraer el innerText
    const objFechaAproxEntregada = await page.$("#span_vFECENTPROM"); // Objeto Fecha Aproximada Entregada
    const getFechaAproxEntregada = await page.evaluate(
      (objFechaAproxEntregada) => objFechaAproxEntregada.innerText,
      objFechaAproxEntregada
    ); // Extraer el innerText
    const objCausa = await page.$("#span_vCAUSA"); // Objeto Causa
    const getCausa = await page.evaluate(
      (objCausa) => objCausa.innerText,
      objCausa
    ); // Extraer el innerText
    const objNovedad = await page.$("#span_vRMSNOTA"); // Objeto Novedad
    const getNovedad = await page.evaluate(
      (objNovedad) => objNovedad.innerText,
      objNovedad
    ); // Extraer el innerText
    const objHora = await page.$("#span_vRMSHRENT"); // Objeto Hora
    const getHora = await page.evaluate(
      (objHora) => objHora.innerText,
      objHora
    ); // Extraer el innerText

    console.log(
      "----->",
      nRemesa,
      " ",
      getCiudad,
      " ",
      getDireccion,
      " ",
      getEstado,
      " ",
      getCajas,
      " ",
      getFechaAproxEntregada,
      " ",
      getFechaEntregada,
      " ",
      getHora,
      " ",
      getCausa,
      " ",
      getNovedad
    );
    const data = {
      nRemesa,
      getCiudad,
      getDireccion,
      getEstado,
      getCajas,
      getFechaAproxEntregada,
      getFechaEntregada,
      getHora,
      getCausa,
      getNovedad,
    }; // agregado a un arreglo
    remesaData.push(data); //agregado remesaData
    console.log("La página se cargó correctamente.");
  } catch (error) {
    console.error("Error: La página no se cargó completamente.");
    intentos++;
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await inputRemesaSolistica(browser, page, nRemesa, intentos);
  }
};

app.post("/process-remesas", async (req, res) => {
  const filePath = req.body.filePath;
  try {
    const result = await busquedaSolis(filePath);
    remesaData = [];
    for (let i = 0; i < result.length; i++) {
      await inputRemesaSolistica(result[i]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 30000");
});

// Primera Función // Leer el archivo de texto //Devuelve Un Array
function busquedaSolis(filePath) {
  return new Promise((resolve, reject) => {
    // Patrón de búsqueda
    const pattern = /B\d{31}/g;

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject("Error al leer el archivo: " + err);
        return;
      }

      // Buscar coincidencias y extraer los últimos 12 dígitos
      const matches = data.match(pattern);
      const extractedNumbers = matches.map((match) =>
        parseInt(match.substr(-12).trim())
      );

      resolve(extractedNumbers);
    });
  });
}

//Función Principal
//Llamar a la función y pasar la ruta del archivo
const filePath = "./doc_envios/Envio_Informacion_Transportador_5301859.txt";

//llamado a la función  busquedaSolis(filePath)
busquedaSolis(filePath)
  .then(async (result) => {
    console.log("Números extraídos:", result);

    const browser = await puppeteer.launch({
      executablePath:
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      headless: true, //False to hide(Esconder)
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage(); // Abrir pestaña

    for (let i = 0; i < result.length; i++) {
      await inputRemesaSolistica(browser, page, result[i]); //función ingresa un navegador una pagina y el array de numero de guias
    }
    await browser.close();
  })
  .catch((error) => {
    console.error(error);
  });
