import React, { useState, useCallback } from 'react';
import { calculate } from '../api/client.js';

/**
 * Calculator component
 *
 * Uses a single mutable expression string model. The UI assembles the string
 * and delegates evaluation entirely to the backend via POST /api/calculate.
 *
 * @param {{ onCalculated: () => void }} props
 */
export default function Calculator({ onCalculated }) {
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const appendDigit = useCallback(
    (digit) => {
      setError(null);
      if (justEvaluated) {
        // Starting fresh after a result
        setExpression(digit);
        setDisplay(digit);
        setJustEvaluated(false);
      } else {
        const next = expression + digit;
        setExpression(next);
        setDisplay(next);
      }
    },
    [expression, justEvaluated]
  );

  const appendOperator = useCallback(
    (op) => {
      setError(null);
      // After evaluate, append operator to the result so users can chain
      const base = justEvaluated ? display : expression;
      const next = base + op;
      setExpression(next);
      setDisplay(next);
      setJustEvaluated(false);
    },
    [expression, display, justEvaluated]
  );

  const appendDecimal = useCallback(() => {
    setError(null);
    // Find the last segment after the last operator to check for existing decimal
    const segments = expression.split(/[+\-*/]/);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment.includes('.')) return; // already has a decimal in current number

    const next = expression === '' ? '0.' : expression + '.';
    setExpression(next);
    setDisplay(next);
    setJustEvaluated(false);
  }, [expression]);

  const clear = useCallback(() => {
    setExpression('');
    setDisplay('0');
    setJustEvaluated(false);
    setError(null);
  }, []);

  const backspace = useCallback(() => {
    setError(null);
    if (justEvaluated) {
      // Backspace on a result clears entirely
      setExpression('');
      setDisplay('0');
      setJustEvaluated(false);
      return;
    }
    const next = expression.slice(0, -1);
    setExpression(next);
    setDisplay(next === '' ? '0' : next);
  }, [expression, justEvaluated]);

  const evaluate = useCallback(async () => {
    if (!expression || loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await calculate(expression);
      setDisplay(String(data.result));
      setExpression(String(data.result));
      setJustEvaluated(true);
      if (onCalculated) onCalculated();
    } catch (err) {
      console.error('Calculate failed:', err);
      setError('Cannot evaluate expression');
    } finally {
      setLoading(false);
    }
  }, [expression, loading, onCalculated]);

  return (
    <section className="calculator" aria-label="Calculator">
      <div className="calculator-display" role="status" aria-live="polite" aria-label="Expression display">
        <span className="display-text">{display}</span>
      </div>

      {error && (
        <div className="calculator-error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      <div className="calculator-buttons" role="group" aria-label="Calculator buttons">
        {/* Row 1: Clear, Backspace, Divide, Multiply */}
        <button
          className="btn btn-utility span-2"
          onClick={clear}
          aria-label="clear"
          disabled={loading}
        >
          C
        </button>
        <button
          className="btn btn-utility"
          onClick={backspace}
          aria-label="backspace"
          disabled={loading}
        >
          &#x232B;
        </button>
        <button
          className="btn btn-operator"
          onClick={() => appendOperator('/')}
          aria-label="divide"
          disabled={loading}
        >
          &#247;
        </button>

        {/* Row 2: 7, 8, 9, Multiply */}
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('7')}
          aria-label="digit 7"
          disabled={loading}
        >
          7
        </button>
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('8')}
          aria-label="digit 8"
          disabled={loading}
        >
          8
        </button>
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('9')}
          aria-label="digit 9"
          disabled={loading}
        >
          9
        </button>
        <button
          className="btn btn-operator"
          onClick={() => appendOperator('*')}
          aria-label="multiply"
          disabled={loading}
        >
          &times;
        </button>

        {/* Row 3: 4, 5, 6, Subtract */}
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('4')}
          aria-label="digit 4"
          disabled={loading}
        >
          4
        </button>
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('5')}
          aria-label="digit 5"
          disabled={loading}
        >
          5
        </button>
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('6')}
          aria-label="digit 6"
          disabled={loading}
        >
          6
        </button>
        <button
          className="btn btn-operator"
          onClick={() => appendOperator('-')}
          aria-label="subtract"
          disabled={loading}
        >
          &minus;
        </button>

        {/* Row 4: 1, 2, 3, Add */}
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('1')}
          aria-label="digit 1"
          disabled={loading}
        >
          1
        </button>
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('2')}
          aria-label="digit 2"
          disabled={loading}
        >
          2
        </button>
        <button
          className="btn btn-digit"
          onClick={() => appendDigit('3')}
          aria-label="digit 3"
          disabled={loading}
        >
          3
        </button>
        <button
          className="btn btn-operator"
          onClick={() => appendOperator('+')}
          aria-label="add"
          disabled={loading}
        >
          +
        </button>

        {/* Row 5: 0, Decimal, Equals */}
        <button
          className="btn btn-digit span-2"
          onClick={() => appendDigit('0')}
          aria-label="digit 0"
          disabled={loading}
        >
          0
        </button>
        <button
          className="btn btn-digit"
          onClick={appendDecimal}
          aria-label="decimal point"
          disabled={loading}
        >
          .
        </button>
        <button
          className="btn btn-equals"
          onClick={evaluate}
          aria-label="equals"
          disabled={loading || !expression}
        >
          {loading ? '...' : '='}
        </button>
      </div>
    </section>
  );
}
