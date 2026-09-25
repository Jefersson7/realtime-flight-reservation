import { useState } from 'react';
import { FlightDto } from '@shared/dto';
import { FlightSearchPage } from './pages/FlightSearchPage';
import { SeatSelectionPage } from './pages/SeatSelectionPage';

function App() {
  const [selectedFlight, setSelectedFlight] = useState<FlightDto | null>(null);

  if (selectedFlight) {
    return (
      <SeatSelectionPage flight={selectedFlight} onBack={() => setSelectedFlight(null)} />
    );
  }

  return <FlightSearchPage onChooseSeats={setSelectedFlight} />;
}

export default App;
