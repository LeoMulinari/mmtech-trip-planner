export const formatarNomeDestino = (
    suggestion: google.maps.places.AutocompletePrediction,
    geocodedResult: google.maps.GeocoderResult
): string => {
    const { structured_formatting } = suggestion;
    const { address_components } = geocodedResult;

    // Função auxiliar para encontrar um componente
    const get = (type: string, useShortName = false) => {
        const component = address_components.find(c => c.types.includes(type));
        return component ? (useShortName ? component.short_name : component.long_name) : '';
    };

    // 1. Pega o nome principal da forma mais confiável
    let nomePrincipal = structured_formatting.main_text;

    // Caso especial para endereços de rua, monta "Rua, Número"
    if (geocodedResult.types.includes('street_address')) {
        const rua = get('route');
        const numero = get('street_number');
        if (rua) {
            nomePrincipal = numero ? `${rua}, ${numero}` : rua;
        }
    }

    // 2. Pega todas as outras partes do contexto
    const cidade = get('locality') || get('administrative_area_level_2');
    const estado = get('administrative_area_level_1', true); // Pega o nome curto (PR)
    const pais = get('country');

    // 3. Montagem inteligente usando um Set para evitar duplicatas
    // Um Set só permite valores únicos, então se "Ponta Grossa" aparecer duas vezes, ele só guarda uma.
    const partes = new Set<string>();

    partes.add(nomePrincipal);
    partes.add(cidade);
    partes.add(estado);
    partes.add(pais);

    // Converte o Set de volta para um array, remove qualquer parte vazia, e junta com ", "
    return Array.from(partes).filter(Boolean).join(', ');
};