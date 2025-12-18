const PDOK_BASE_2024 = 'https://api.pdok.nl/cbs/wijken-en-buurten-2024/ogc/v1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchGeometry(code: string): Promise<any | null> {
  let collectionName: string;
  let possiblePropertyNames: string[];

  if (code.startsWith('BU')) {
    collectionName = 'buurten';
    possiblePropertyNames = ['buurtcode', 'statcode', 'code'];
  } else if (code.startsWith('WK')) {
    collectionName = 'wijken';
    possiblePropertyNames = ['wijkcode', 'statcode', 'code'];
  } else if (code.startsWith('GM')) {
    collectionName = 'gemeenten';
    possiblePropertyNames = ['gemeentecode', 'statcode', 'code'];
  } else {
    return null;
  }

  // Probeer verschillende property names
  for (const propName of possiblePropertyNames) {
    const url = `${PDOK_BASE_2024}/collections/${collectionName}/items?${propName}=${code}`;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return data.features[0];
        }
      }
    } catch (error) {
      console.warn(`PDOK fetch error for ${propName}:`, error);
    }
  }

  // Fallback naar oudere API
  const fallbackBase = 'https://api.pdok.nl/cbs/gebiedsindelingen/ogc/v1';
  const codeType = code.startsWith('BU') ? 'buurt' : code.startsWith('WK') ? 'wijk' : 'gemeente';
  const fallbackCollection = `${codeType}_gegeneraliseerd_2024`;

  for (const propName of ['statcode', 'code']) {
    const url = `${fallbackBase}/collections/${fallbackCollection}/items?${propName}=${code}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          return data.features[0];
        }
      }
    } catch (error) {
      console.warn(`Fallback PDOK error:`, error);
    }
  }

  return null;
}
