import { useState } from 'react';
import { BookingDto, FlightDto, SeatDto } from '@shared/dto';
import { FlightSearchPage } from './pages/FlightSearchPage';
import { SeatSelectionPage } from './pages/SeatSelectionPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { FlightDashboardPage } from './pages/FlightDashboardPage';

type Screen =
  | { name: 'search' }
  | { name: 'seats'; flight: FlightDto }
  | { name: 'checkout'; flight: FlightDto; seat: SeatDto }
  | { name: 'confirmation'; flight: FlightDto; booking: BookingDto }
  | { name: 'dashboard'; flight: FlightDto };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'search' });

  switch (screen.name) {
    case 'dashboard':
      return <FlightDashboardPage flight={screen.flight} onBack={() => setScreen({ name: 'search' })} />;
    case 'seats':
      return (
        <SeatSelectionPage
          flight={screen.flight}
          onBack={() => setScreen({ name: 'search' })}
          onContinueToPayment={(seat) => setScreen({ name: 'checkout', flight: screen.flight, seat })}
        />
      );
    case 'checkout':
      return (
        <CheckoutPage
          flight={screen.flight}
          seat={screen.seat}
          onBack={() => setScreen({ name: 'seats', flight: screen.flight })}
          onConfirmed={(booking) => setScreen({ name: 'confirmation', flight: screen.flight, booking })}
        />
      );
    case 'confirmation':
      return (
        <ConfirmationPage
          flight={screen.flight}
          booking={screen.booking}
          onDone={() => setScreen({ name: 'search' })}
        />
      );
    case 'search':
    default:
      return (
        <FlightSearchPage
          onChooseSeats={(flight) => setScreen({ name: 'seats', flight })}
          onViewDashboard={(flight) => setScreen({ name: 'dashboard', flight })}
        />
      );
  }
}

export default App;
