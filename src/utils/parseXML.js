/**
 * Парсит eForms XML и возвращает массив организаций с нужными полями.
 * @param {string} xmlString
 * @returns {{ organizations: Array<{ name: string, description: string, street: string, city: string, postCode: string, country: string, website: string, companyId: string, email: string, phone: string }> }}
 */
export function parseXML(xmlString) {
  const parser = new window.DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Пространства имён
  const efac = "http://data.europa.eu/p27/eforms-ubl-extension-aggregate-components/1";
  const cbc = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
  const cac = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";

  // Описание закупки (берём первое попавшееся)
  let description = "";
  const descNode = xmlDoc.getElementsByTagNameNS(cbc, "Description")[0];
  if (descNode) description = descNode.textContent.trim();

  // Ищем все организации
  const orgNodes = xmlDoc.getElementsByTagNameNS(efac, "Organization");
  const organizations = [];

  for (let i = 0; i < orgNodes.length; i++) {
    const org = orgNodes[i];

    // Название
    const nameNode = org.getElementsByTagNameNS(cbc, "Name")[0];
    const name = nameNode ? nameNode.textContent.trim() : "";

    // Сайт
    const websiteNode = org.getElementsByTagNameNS(cbc, "WebsiteURI")[0];
    const website = websiteNode ? websiteNode.textContent.trim() : "";

    // CompanyID (ИНН)
    const companyIdNode = org.getElementsByTagNameNS(cbc, "CompanyID")[0];
    const companyId = companyIdNode ? companyIdNode.textContent.trim() : "";

    // Email
    const emailNode = org.getElementsByTagNameNS(cbc, "ElectronicMail")[0];
    const email = emailNode ? emailNode.textContent.trim() : "";

    // Телефон
    const phoneNode = org.getElementsByTagNameNS(cbc, "Telephone")[0];
    const phone = phoneNode ? phoneNode.textContent.trim() : "";

    // Адрес
    const addressNode = org.getElementsByTagNameNS(cac, "PostalAddress")[0];
    let street = "", city = "", postCode = "", country = "";
    if (addressNode) {
      const streetNode = addressNode.getElementsByTagNameNS(cbc, "StreetName")[0];
      const cityNode = addressNode.getElementsByTagNameNS(cbc, "CityName")[0];
      const postCodeNode = addressNode.getElementsByTagNameNS(cbc, "PostalZone")[0];
      const countryNode = addressNode.getElementsByTagNameNS(cac, "Country")[0];
      const countryCodeNode = countryNode ? countryNode.getElementsByTagNameNS(cbc, "IdentificationCode")[0] : null;

      street = streetNode ? streetNode.textContent.trim() : "";
      city = cityNode ? cityNode.textContent.trim() : "";
      postCode = postCodeNode ? postCodeNode.textContent.trim() : "";
      country = countryCodeNode ? countryCodeNode.textContent.trim() : "";
    }

    organizations.push({
      name,
      description, // общее описание закупки
      street,
      city,
      postCode,
      country,
      website,
      companyId,
      email,
      phone
    });
  }

  return { organizations };
}