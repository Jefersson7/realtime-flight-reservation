import { FormEvent, useState } from 'react';
import { FlightSearchQuery } from '@shared/dto';
import './FlightSearchForm.css';

interface FlightSearchFormProps {
  onSearch: (query: FlightSearchQuery) => void;
}

export function FlightSearchForm({ onSearch }: FlightSearchFormProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch({
      origin: origin || undefined,
      destination: destination || undefined,
      date: date || undefined,
    });
  }

  function handleSwap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function handleClear() {
    setOrigin('');
    setDestination('');
    setDate('');
    onSearch({});
  }

  return (
    <form className="search-card" onSubmit={handleSubmit}>
      <div className="search-fields">
        <div className="search-field search-field--code">
          <label htmlFor="origin">Origen</label>
          <input
            id="origin"
            placeholder="BOG"
            value={origin}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            maxLength={3}
          />
        </div>

        <button
          type="button"
          className="search-swap"
          onClick={handleSwap}
          aria-label="Intercambiar origen y destino"
          title="Intercambiar origen y destino"
        >
          ⇄
        </button>

        <div className="search-field search-field--code">
          <label htmlFor="destination">Destino</label>
          <input
            id="destination"
            placeholder="MIA"
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            maxLength={3}
          />
        </div>

        <div className="search-field">
          <label htmlFor="date">Fecha</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button type="submit" className="search-submit">
          🔍 Buscar vuelos
        </button>

        {(origin || destination || date) && (
          <button type="button" className="search-clear" onClick={handleClear}>
            Limpiar
          </button>
        )}
      </div>
    </form>
  );
}
