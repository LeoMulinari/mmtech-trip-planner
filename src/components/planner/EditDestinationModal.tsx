'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Destino, SelectedPlace } from '@/types';
import { formatarNomeDestino } from '@/lib/formatters';

type EditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, novosDados: SelectedPlace) => void;
  destino: Destino | null;
};

export default function EditDestinationModal({ isOpen, onClose, onSave, destino }: EditModalProps) {
  const [novoDestino, setNovoDestino] = useState<SelectedPlace | null>(null);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ requestOptions: {}, debounce: 300 });

  // Preenche o campo de busca com o nome do destino atual quando o modal abre
  useEffect(() => {
    if (destino) {
      setValue(destino.nome, false);
      setNovoDestino({ nome: destino.nome, lat: destino.latitude, lng: destino.longitude });
    }
  }, [destino, setValue]);

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setValue(suggestion.description, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ placeId: suggestion.place_id });
      const { lat, lng } = await getLatLng(results[0]);
      const nomeFormatado = formatarNomeDestino(suggestion, results[0]);
      setNovoDestino({ nome: nomeFormatado, lat, lng });
    } catch (error) {
      console.error("Erro ao obter coordenadas: ", error);
    }
  };

  const handleSave = () => {
    if (destino?._id && novoDestino) {
      onSave(destino._id, novoDestino);
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border border-slate-700">
                <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white">
                  Editar Destino
                </Dialog.Title>
                <div className="mt-4">
                  <div className="relative flex-grow w-full">
                    <input type="text" value={value} onChange={(e) => setValue(e.target.value)} disabled={!ready} className="p-3 w-full border-2 border-slate-600 bg-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
                    {status === "OK" && (
                      <ul className="absolute z-10 w-full bg-slate-700 border border-slate-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                        {data.map((suggestion) => (
                          <li key={suggestion.place_id} onClick={() => handleSelect(suggestion)} className="p-3 hover:bg-sky-600 cursor-pointer">{suggestion.description}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={onClose} className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSave} disabled={!novoDestino} className="inline-flex justify-center rounded-md border border-transparent bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:bg-slate-600">
                    Salvar Alterações
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}