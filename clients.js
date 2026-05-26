// Mapeo canónico de clientes — GSC site ↔ Ads customer ID ↔ rubro
// adsCustomerId: null → cliente solo tiene GSC, sin cuenta Ads activa

const CLIENTS = [
  {
    name: "Parkavendo",
    gscSite: "sc-domain:parkavendo.com",
    adsCustomerId: "9333187091",
    industry: "endocrinología, tiroides, pérdida de peso, hormonas",
  },
  {
    name: "Dynamic Mobile Tire",
    gscSite: "sc-domain:dynamicmobiletire.com",
    adsCustomerId: "4096249317",
    industry: "servicio móvil de neumáticos, reparación de pinchazos a domicilio",
  },
  {
    name: "North West Continence",
    gscSite: "sc-domain:nwcontinence.com",
    adsCustomerId: "8825638233",
    industry: "incontinencia urinaria, vejiga hiperactiva, salud pélvica",
  },
  {
    name: "SpinalDx",
    gscSite: "sc-domain:spinaldx.com",
    adsCustomerId: "4858931586",
    industry: "salud de columna, dolor de espalda, fisioterapia, manejo del dolor",
  },
  {
    name: "Superior Equipment Repair",
    gscSite: "sc-domain:superiorequipmentrepair.com",
    adsCustomerId: "5382548997",
    industry: "reparación de camiones diésel, mantenimiento de flotas",
  },
  {
    name: "Mesa Family Physicians",
    gscSite: "sc-domain:mesafp.com",
    adsCustomerId: "8142017742",
    industry: "medicina familiar, atención primaria, síntomas comunes, salud general",
  },
  // Solo GSC — sin cuenta Ads activa
  {
    name: "Lake Tahoe Consulting",
    gscSite: "sc-domain:laketahoeconsulting.com",
    adsCustomerId: null,
    industry: "consultoría de marketing, Lake Tahoe",
  },
  {
    name: "RG Tree Care",
    gscSite: "sc-domain:rgtreecare.com",
    adsCustomerId: null,
    industry: "cuidado de árboles, podado, desmonte de terrenos",
  },
  {
    name: "Gomez Brothers Racing",
    gscSite: "sc-domain:gomezbrothersracing.com",
    adsCustomerId: null,
    industry: "automovilismo, carreras, pilotos",
  },
  {
    name: "BMI Smart Cloud",
    gscSite: "sc-domain:bmismartcloud.com",
    adsCustomerId: null,
    industry: "soluciones cloud, IT, gestión de datos",
  },
];

function getClientByGscSite(siteUrl) {
  return CLIENTS.find((c) => c.gscSite === siteUrl) || null;
}

function getActiveClients() {
  return CLIENTS;
}

module.exports = { CLIENTS, getClientByGscSite, getActiveClients };
