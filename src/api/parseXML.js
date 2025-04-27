const parseXML = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const namespaces = {
    efac: "http://data.europa.eu/p27/eforms-ubl-extension-aggregate-components/1",
    efbc: "http://data.europa.eu/p27/eforms-ubl-extension-basic-components/1",
    cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  };

  const getTextContent = (node, tagName, ns = "cbc") =>
    node.getElementsByTagNameNS(namespaces[ns], tagName)[0]?.textContent || "Данные отсутствуют";

  const organizations = xmlDoc.getElementsByTagNameNS(namespaces.efac, "Organization");
  const publication = xmlDoc.getElementsByTagNameNS(namespaces.efbc, "Publication")[0];
  const procurementProject = xmlDoc.getElementsByTagNameNS(namespaces.cac, "ProcurementProject")[0];
  const realizedLocation = xmlDoc.getElementsByTagNameNS(namespaces.cac, "RealizedLocation")[0];

  // Извлечение организаций
  const parsedOrganizations = Array.from(organizations).map((organization) => ({
    name: getTextContent(organization, "Name", "cbc"),
    address: {
      street: getTextContent(organization, "StreetName", "cbc"),
      city: getTextContent(organization, "CityName", "cbc"),
      postalZone: getTextContent(organization, "PostalZone", "cbc"),
      nutsCode: getTextContent(organization, "CountrySubentityCode", "cbc"),
      countryCode: getTextContent(organization, "IdentificationCode", "cbc"),
    },
    contact: {
      phone: getTextContent(organization, "Telephone", "cbc"),
      email: getTextContent(organization, "ElectronicMail", "cbc"),
    },
  }));

  // Извлечение публикации
  const parsedPublication = {
    publicationID: getTextContent(publication, "NoticePublicationID", "efbc"),
    gazetteID: getTextContent(publication, "GazetteID", "efbc"),
    publicationDate: getTextContent(publication, "PublicationDate", "efbc"),
  };

  // Извлечение проекта тендера
  const parsedProcurementProject = {
    id: getTextContent(procurementProject, "ID", "cbc"),
    name: getTextContent(procurementProject, "Name", "cbc"),
    description: getTextContent(procurementProject, "Description", "cbc"),
    typeCode: getTextContent(procurementProject, "ProcurementTypeCode", "cbc"),
  };

  // Извлечение координат и NUTS-кода
  const parsedRealizedLocation = {
    nutsCode: getTextContent(realizedLocation, "CountrySubentityCode", "cbc"),
    countryCode: getTextContent(realizedLocation, "IdentificationCode", "cbc"),
  };

  return {
    organizations: parsedOrganizations,
    publication: parsedPublication,
    procurementProject: parsedProcurementProject,
    realizedLocation: parsedRealizedLocation,
  };
};

export default parseXML;

