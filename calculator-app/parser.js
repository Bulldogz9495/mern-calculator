'use strict';

/**
 * Safe recursive-descent arithmetic parser.
 *
 * Grammar (EBNF):
 *   expression  = term  { ('+' | '-') term }
 *   term        = unary { ('*' | '/') unary }
 *   unary       = '-' unary | primary
 *   primary     = NUMBER | '(' expression ')'
 */

class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ParseError';
  }
}

class DivisionByZeroError extends Error {
  constructor() {
    super('Division by zero');
    this.name = 'DivisionByZeroError';
  }
}

function tokenise(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let numStr = '';
      let hasDot = false;
      while (i < input.length && (/[0-9]/.test(input[i]) || (input[i] === '.' && !hasDot))) {
        if (input[i] === '.') hasDot = true;
        numStr += input[i]; i++;
      }
      const value = parseFloat(numStr);
      if (!isFinite(value)) throw new ParseError('Invalid number literal');
      tokens.push({ type: 'NUMBER', value });
      continue;
    }
    switch (ch) {
      case '+': tokens.push({ type: 'PLUS' });   break;
      case '-': tokens.push({ type: 'MINUS' });  break;
      case '*': tokens.push({ type: 'STAR' });   break;
      case '/': tokens.push({ type: 'SLASH' });  break;
      case '(': tokens.push({ type: 'LPAREN' }); break;
      case ')': tokens.push({ type: 'RPAREN' }); break;
      default: throw new ParseError(`Unexpected character: '${ch}'`);
    }
    i++;
  }
  tokens.push({ type: 'EOF' });
  return tokens;
}

class Parser {
  constructor(tokens) { this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  consume(expectedType) {
    const token = this.tokens[this.pos];
    if (expectedType && token.type !== expectedType) {
      throw new ParseError(`Expected ${expectedType} but got ${token.type}`);
    }
    this.pos++;
    return token;
  }
  parseExpression() {
    let left = this.parseTerm();
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const op = this.consume().type;
      const right = this.parseTerm();
      left = op === 'PLUS' ? left + right : left - right;
    }
    return left;
  }
  parseTerm() {
    let left = this.parseUnary();
    while (this.peek().type === 'STAR' || this.peek().type === 'SLASH') {
      const op = this.consume().type;
      const right = this.parseUnary();
      if (op === 'SLASH') {
        if (right === 0) throw new DivisionByZeroError();
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }
  parseUnary() {
    if (this.peek().type === 'MINUS') { this.consume('MINUS'); return -this.parseUnary(); }
    return this.parsePrimary();
  }
  parsePrimary() {
    const token = this.peek();
    if (token.type === 'NUMBER') { this.consume('NUMBER'); return token.value; }
    if (token.type === 'LPAREN') {
      this.consume('LPAREN');
      const value = this.parseExpression();
      if (this.peek().type !== 'RPAREN') throw new ParseError('Missing closing parenthesis');
      this.consume('RPAREN');
      return value;
    }
    if (token.type === 'EOF') throw new ParseError('Unexpected end of expression');
    throw new ParseError(`Unexpected token: ${token.type}`);
  }
}

function evaluate(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') {
    throw new ParseError('Expression must be a non-empty string');
  }
  const tokens = tokenise(expression);
  const parser = new Parser(tokens);
  const result = parser.parseExpression();
  if (parser.peek().type !== 'EOF') throw new ParseError('Unexpected tokens after expression');
  if (!isFinite(result)) throw new ParseError('Expression produced a non-finite result');
  return result;
}

module.exports = { evaluate, ParseError, DivisionByZeroError };
