import React, { useState, useCallback } from 'react';
import Calculator from './components/Calculator.jsx';
import History from './components/History.jsx';

/**
 * Root application component.
 *
 * Coordinates Calculator and History by passing a refreshTrigger counter
 * that increments on every successful calculation, causing History to re-fetch.
 */
export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCalculated = useCallback(() => {
    setRefreshTrigger((n) => n + 1);
  }, []);

  return (
    <main className="app-layout">
      <h1 className="app-title">Calculator</h1>
      <div className="app-content">
        <Calculator onCalculated={handleCalculated} />
        <History refreshTrigger={refreshTrigger} />
      </div>
    </main>
  );
}
