/**
* Formata um nome de destino de forma inteligente e consistente a partir dos dados do Google.
* @param {google.maps.places.AutocompletePrediction} suggestion - O objeto da sugestão de autocomplete. É a fonte mais confiável para o nome principal.
* @param {google.maps.GeocoderResult} geocodedResult - O resultado do geocode. Usado para obter os componentes detalhados do endereço.
* @returns {string} O nome do destino formatado, ex: "Museu do Louvre, Paris, França".
*/

export const formatarNomeDestino = (
    suggestion: google.maps.places.AutocompletePrediction,
    geocodedResult: google.maps.GeocoderResult
): string => {
    const { structured_formatting } = suggestion;
    const { address_components } = geocodedResult;

    const get = (type: string, useShortName = false) => {
        const component = address_components.find(c => c.types.includes(type));
        return component ? (useShortName ? component.short_name : component.long_name) : '';
    };

    let nomePrincipal = structured_formatting.main_text;

    // Caso especial para endereços de rua, monta "Rua, Número"
    if (geocodedResult.types.includes('street_address')) {
        const rua = get('route');
        const numero = get('street_number');
        if (rua) {
            nomePrincipal = numero ? `${rua}, ${numero}` : rua;
        }
    }

    // 'administrative_area_level_2' garante que pegamos a cidade mesmo em locais específicos.
    const cidade = get('locality') || get('administrative_area_level_2');
    const estado = get('administrative_area_level_1', true); 
    const pais = get('country');

    // Usar Set para garantir que não haverá partes duplicadas no nome final
    const partes = new Set<string>();

    partes.add(nomePrincipal);
    partes.add(cidade);
    partes.add(estado);
    partes.add(pais);

    return Array.from(partes).filter(Boolean).join(', ');
};